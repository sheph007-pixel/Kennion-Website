/**
 * Kennion Risk Screen (KRS) v1.0
 *
 * Deterministic group-level underwriting screen. Sits upstream of the
 * Kennion Actuarial Rater (KAR) — produces a single composite Kennion
 * Risk Index (KRI) and a tier verdict (Preferred / Standard / High Risk).
 *
 * Public API:
 *   screenGroup(input) -> ScreenResult
 *
 * Same census in → same score out. No randomness. Every result carries
 * a model_hash that identifies the methodology + weight set + lookup
 * table hashes used.
 *
 * Inputs are the same census fields used by the rate engine:
 *   relationship · firstName · lastName · dob · sex · zip
 *
 * Composite formula (see METHODOLOGY.md §4.2):
 *
 *   KRI = w_demo·Demo + w_geo·Geo + w_comp·Comp + clamp(Residual, ±0.10)
 *
 * Drop-in: place at server/risk-screen.ts in the Kennion-Website repo.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { CensusEntry } from "@shared/schema";

// ────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────

export type RiskTier = "Preferred" | "Standard" | "High Risk";

export interface ScreenMember {
  relationship: string;
  firstName?: string;
  lastName?: string;
  dob: string | Date;
  sex?: string | null;
  zip?: string | null;
}

export interface ScreenInput {
  census: ScreenMember[];
  effectiveDate: string | Date;
  group?: string;
}

export interface ComponentScore {
  raw: number;          // raw component value
  normalized: number;   // normalized to book-median = 1.00
  contribution: number; // weighted contribution to KRI
  drivers: string[];    // human-readable explanation lines
}

export interface ScreenResult {
  model_version: string;
  model_hash: string;
  group?: string;
  effective_date: string;
  scored_at: string;

  // Group profile
  n_members: number;
  n_employees: number;
  n_spouses: number;
  n_children: number;
  median_age: number;
  avg_age: number;
  pct_female: number;
  family_tier_mix: { EE: number; ECH: number; ESP: number; FAM: number };
  top_county: string;
  pct_top_county: number;
  pct_medicare_cliff: number; // share within 5 yrs of 65

  // Component scores
  demographic: ComponentScore;
  geographic: ComponentScore;
  composition: ComponentScore;
  ai_residual: { raw: number; clamped: number; drivers: string[] };

  // Composite
  kri: number;
  tier: RiskTier;
  decision: "QUOTE" | "QUOTE_WITH_REVIEW" | "DECLINE";

  // Top drivers across all components, sorted by contribution magnitude
  top_drivers: Array<{ category: string; text: string; impact: number }>;

  // AI summary narrative (3-5 sentences)
  ai_summary: string;
}

interface MepsCell {
  mean_totexp: number;
  mean_totprv: number;
  p90_totexp: number;
  n: number;
}

interface MepsTable {
  version: string;
  source_files: string[];
  source_sha256: string;
  built_at: string;
  // Key format: `${ageBand}|${sex}|${region}` e.g. "40-44|M|3"
  cells: Record<string, MepsCell>;
  national_book_median_pmpy: number; // calibration constant E_k
}

interface PlacesCounty {
  fips: string;
  name: string;
  state: string;
  diabetes: number | null;
  obesity: number | null;
  csmoking: number | null;
  copd: number | null;
  bphigh: number | null;
  mhlth: number | null;
  geo_z: number; // composite Z-score across the 6 indicators
}

interface PlacesTable {
  version: string;
  source_file: string;
  source_sha256: string;
  built_at: string;
  national_means: Record<string, { mean: number; sd: number }>;
  counties: Record<string, PlacesCounty>; // keyed by FIPS
}

interface ZipToCounty {
  version: string;
  source: string;
  built_at: string;
  // ZIP5 → county FIPS (primary)
  zip5: Record<string, string>;
  // ZIP3 → county FIPS (fallback for unknown ZIP5)
  zip3: Record<string, string>;
}

interface ModelWeights {
  version: string;
  w_demo: number;
  w_geo: number;
  w_comp: number;
  alpha_geo_scaling: number;     // α in Geo formula
  beta_medicare_cliff: number;   // β1
  beta_concentration: number;    // β2
  small_group_threshold: number; // employees below this get a load
  small_group_load: number;      // multiplicative
  thresholds: { preferred: number; high_risk: number };
}

// ────────────────────────────────────────────────────────────────────────
// Lookup-table loading (cached)
// ────────────────────────────────────────────────────────────────────────

const SCREEN_DIR = path.resolve(process.cwd(), "server", "screen");

let _meps: MepsTable | null = null;
let _places: PlacesTable | null = null;
let _zipMap: ZipToCounty | null = null;
let _weights: ModelWeights | null = null;

function loadJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(SCREEN_DIR, file), "utf8")) as T;
}

export function loadScreenTables(): {
  meps: MepsTable; places: PlacesTable; zipMap: ZipToCounty; weights: ModelWeights;
} {
  if (!_meps)    _meps    = loadJson<MepsTable>("meps-expected-cost.json");
  if (!_places)  _places  = loadJson<PlacesTable>("places-county-index.json");
  if (!_zipMap)  _zipMap  = loadJson<ZipToCounty>("zip-to-county.json");
  if (!_weights) _weights = loadJson<ModelWeights>("model-weights.json");
  return { meps: _meps, places: _places, zipMap: _zipMap, weights: _weights };
}

export function reloadScreenTables(): void {
  _meps = null; _places = null; _zipMap = null; _weights = null;
}

function computeModelHash(
  meps: MepsTable, places: PlacesTable, zipMap: ZipToCounty, weights: ModelWeights,
): string {
  const h = crypto.createHash("sha256");
  h.update(meps.source_sha256);
  h.update(places.source_sha256);
  h.update(zipMap.version);
  h.update(JSON.stringify(weights));
  return h.digest("hex").slice(0, 12);
}

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────

function parseDate(d: string | Date): Date {
  if (d instanceof Date) return d;
  const s = String(d).trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(s);
  if (us) {
    let y = +us[3];
    if (y < 100) y += (y < 30 ? 2000 : 1900);
    return new Date(y, +us[1] - 1, +us[2]);
  }
  const d2 = new Date(s);
  if (!isNaN(d2.getTime())) return d2;
  throw new Error(`Unparseable date: ${s}`);
}

function ageAsOf(dob: Date, eff: Date): number {
  let y = eff.getFullYear() - dob.getFullYear();
  if (eff.getMonth() < dob.getMonth() ||
      (eff.getMonth() === dob.getMonth() && eff.getDate() < dob.getDate())) y--;
  return Math.max(0, y);
}

function ageBand(age: number): string {
  if (age < 5)   return "0-4";
  if (age < 10)  return "5-9";
  if (age < 15)  return "10-14";
  if (age < 20)  return "15-19";
  if (age < 25)  return "20-24";
  if (age < 30)  return "25-29";
  if (age < 35)  return "30-34";
  if (age < 40)  return "35-39";
  if (age < 45)  return "40-44";
  if (age < 50)  return "45-49";
  if (age < 55)  return "50-54";
  if (age < 60)  return "55-59";
  if (age < 65)  return "60-64";
  return "65+";
}

function sexCode(sex?: string | null): "M" | "F" {
  const s = (sex || "").trim().toUpperCase();
  if (s.startsWith("M")) return "M";
  return "F";
}

function relCode(rel: string): "EE" | "SP" | "CH" {
  const r = (rel || "").trim().toLowerCase();
  if (r === "ee" || r.startsWith("emp") || r === "subscriber" || r === "self" || r === "primary") return "EE";
  if (r === "sp" || r.startsWith("spo") || r.includes("partner")) return "SP";
  return "CH";
}

function tierWeight(rel: "EE" | "SP" | "CH"): number {
  // Mirrors the actuary's tier factors for consistent expected-cost weighting.
  // Members in households with kids and/or spouse get prorated tier shares.
  return rel === "EE" ? 1.0 : rel === "SP" ? 1.0 : 0.85;
}

function lookupCounty(zip: string | null | undefined, zm: ZipToCounty): string | null {
  if (!zip) return null;
  const z5 = zip.replace(/\D/g, "").slice(0, 5);
  if (zm.zip5[z5]) return zm.zip5[z5];
  const z3 = z5.slice(0, 3);
  return zm.zip3[z3] || null;
}

function regionFromState(state?: string | null): "1" | "2" | "3" | "4" {
  // MEPS Census Region: 1=NE, 2=MW, 3=South, 4=West.
  // For Kennion's predominantly-AL book, default to South.
  // (Inferred from ZIP later if state missing — for now use South.)
  return "3";
}

// ────────────────────────────────────────────────────────────────────────
// Core scoring
// ────────────────────────────────────────────────────────────────────────

interface EnrichedMember {
  rel: "EE" | "SP" | "CH";
  age: number;
  ageBand: string;
  sex: "M" | "F";
  zip: string | null;
  countyFips: string | null;
  countyZ: number | null;
  expectedPmpy: number;
}

export function screenGroup(input: ScreenInput): ScreenResult {
  const { meps, places, zipMap, weights } = loadScreenTables();
  const eff = parseDate(input.effectiveDate);

  // ── 1. Enrich each member ─────────────────────────────────────────────
  const members: EnrichedMember[] = input.census.map(m => {
    const dob = parseDate(m.dob);
    const age = ageAsOf(dob, eff);
    const ab = ageBand(age);
    const sex = sexCode(m.sex);
    const zip = (m.zip || "").trim() || null;
    const fips = lookupCounty(zip, zipMap);
    const region = regionFromState(null);
    const cellKey = `${ab}|${sex}|${region}`;
    const cell = meps.cells[cellKey];
    const expectedPmpy = cell ? cell.mean_totexp : meps.national_book_median_pmpy;
    const cz = fips && places.counties[fips] ? places.counties[fips].geo_z : null;
    return {
      rel: relCode(m.relationship),
      age, ageBand: ab, sex, zip,
      countyFips: fips,
      countyZ: cz,
      expectedPmpy,
    };
  });

  // ── 2. Group profile ──────────────────────────────────────────────────
  const N = members.length;
  const employees = members.filter(m => m.rel === "EE");
  const spouses   = members.filter(m => m.rel === "SP");
  const children  = members.filter(m => m.rel === "CH");
  const ages = members.map(m => m.age).sort((a,b) => a-b);
  const median_age = ages[Math.floor(ages.length / 2)];
  const avg_age = ages.reduce((s,x) => s+x, 0) / N;
  const pct_female = members.filter(m => m.sex === "F").length / N;
  const pct_medicare_cliff = members.filter(m => m.age >= 60 && m.age <= 64).length / N;

  // Tier mix from household chains (matches rate-engine logic)
  const tierMix = { EE: 0, ECH: 0, ESP: 0, FAM: 0 };
  let curHH: EnrichedMember[] = [];
  const closeHH = () => {
    if (!curHH.length) return;
    const ee = curHH.find(x => x.rel === "EE");
    if (!ee) return;
    const hasSP = curHH.some(x => x.rel === "SP");
    const hasCH = curHH.some(x => x.rel === "CH");
    if (hasSP && hasCH) tierMix.FAM++;
    else if (hasSP)     tierMix.ESP++;
    else if (hasCH)     tierMix.ECH++;
    else                tierMix.EE++;
  };
  for (const m of members) {
    if (m.rel === "EE") { closeHH(); curHH = [m]; }
    else curHH.push(m);
  }
  closeHH();

  // County concentration
  const countyCounts = new Map<string, number>();
  for (const m of members) {
    if (m.countyFips) {
      countyCounts.set(m.countyFips, (countyCounts.get(m.countyFips) || 0) + 1);
    }
  }
  let top_county = "Unknown", top_count = 0;
  for (const [fips, count] of Array.from(countyCounts.entries())) {
    if (count > top_count) { top_count = count; top_county = fips; }
  }
  const top_county_name = places.counties[top_county]
    ? `${places.counties[top_county].name}, ${places.counties[top_county].state}`
    : "Unknown";
  const pct_top_county = N > 0 ? top_count / N : 0;

  // ── 3. Demographic component ──────────────────────────────────────────
  let weightedExp = 0, sumW = 0;
  for (const m of members) {
    const w = tierWeight(m.rel);
    weightedExp += m.expectedPmpy * w;
    sumW += w;
  }
  const groupExpectedPmpy = sumW > 0 ? weightedExp / sumW : 0;
  const demoNormalized = groupExpectedPmpy / meps.national_book_median_pmpy;
  const demoDrivers: string[] = [];
  if (avg_age >= 50) demoDrivers.push(`Avg age ${avg_age.toFixed(1)} elevates expected medical cost`);
  if (pct_medicare_cliff >= 0.10) demoDrivers.push(`${(pct_medicare_cliff*100).toFixed(0)}% of group within 5 yrs of Medicare`);
  if (pct_female > 0.60) demoDrivers.push(`Female-heavy mix (${(pct_female*100).toFixed(0)}%) — higher utilization tier`);
  const demo: ComponentScore = {
    raw: groupExpectedPmpy,
    normalized: demoNormalized,
    contribution: weights.w_demo * demoNormalized,
    drivers: demoDrivers,
  };

  // ── 4. Geographic component ───────────────────────────────────────────
  const geoZs = members.map(m => m.countyZ).filter((z): z is number => z !== null);
  const meanGeoZ = geoZs.length > 0 ? geoZs.reduce((s,x) => s+x, 0) / geoZs.length : 0;
  const geoNormalized = 1 + weights.alpha_geo_scaling * meanGeoZ;
  const geoDrivers: string[] = [];
  if (meanGeoZ > 0.5) geoDrivers.push(`Members concentrated in counties ${meanGeoZ.toFixed(2)} SD above national health-risk mean`);
  if (pct_top_county > 0.5 && places.counties[top_county]?.geo_z && places.counties[top_county].geo_z > 0.3) {
    geoDrivers.push(`${(pct_top_county*100).toFixed(0)}% of members in single high-risk county (${top_county_name})`);
  }
  const geo: ComponentScore = {
    raw: meanGeoZ,
    normalized: geoNormalized,
    contribution: weights.w_geo * geoNormalized,
    drivers: geoDrivers,
  };

  // ── 5. Composition component ──────────────────────────────────────────
  const cliff = pct_medicare_cliff;
  const conc = pct_top_county;
  const smallGroup = employees.length < weights.small_group_threshold;
  const sgAdj = smallGroup ? weights.small_group_load : 1.0;
  const compNormalized =
    (1 + weights.beta_medicare_cliff * cliff) *
    (1 + weights.beta_concentration  * conc) *
    sgAdj;
  const compDrivers: string[] = [];
  if (smallGroup) compDrivers.push(`Small group (${employees.length} EE) — volatility load applied`);
  if (cliff >= 0.10) compDrivers.push(`Medicare-cliff exposure: ${(cliff*100).toFixed(0)}% within 5 yrs of 65`);
  if (conc >= 0.7) compDrivers.push(`High geographic concentration: ${(conc*100).toFixed(0)}% in one county`);
  const comp: ComponentScore = {
    raw: 1.0,
    normalized: compNormalized,
    contribution: weights.w_comp * compNormalized,
    drivers: compDrivers,
  };

  // ── 6. AI residual (placeholder: 0 until model is fit) ────────────────
  // v1.0 ships with residual = 0. v1.1 will load a trained gradient boosted
  // model from disk and produce a bounded ±0.10 adjustment.
  const aiResidualRaw = 0;
  const aiResidualClamped = Math.max(-0.10, Math.min(0.10, aiResidualRaw));
  const aiResidualDrivers: string[] = aiResidualClamped !== 0
    ? [`ML residual adjustment: ${(aiResidualClamped*100).toFixed(1)}%`]
    : [];

  // ── 7. Composite KRI ──────────────────────────────────────────────────
  const kri = demo.contribution + geo.contribution + comp.contribution + aiResidualClamped;

  // ── 8. Tier verdict ───────────────────────────────────────────────────
  let tier: RiskTier;
  let decision: ScreenResult["decision"];
  if (kri < weights.thresholds.preferred) {
    tier = "Preferred";
    decision = "QUOTE";
  } else if (kri < weights.thresholds.high_risk) {
    tier = "Standard";
    decision = "QUOTE";
  } else {
    tier = "High Risk";
    decision = "DECLINE";
  }

  // ── 9. Top drivers — describe the score, not threshold violations ────
  // Always populate so every screen has a populated "why" panel.
  // Drivers describe the *most informative* facts about this group's score.
  const drivers: Array<{ category: string; text: string; impact: number }> = [];

  // Demographic — show the strongest signal in the age/sex mix.
  if (avg_age >= 45) {
    drivers.push({
      category: "Demographic",
      text: `Avg age ${avg_age.toFixed(0)} elevates expected medical cost (book median ≈ 40)`,
      impact: +(demoNormalized - 1.0),
    });
  } else if (avg_age <= 35) {
    drivers.push({
      category: "Demographic",
      text: `Young workforce (avg age ${avg_age.toFixed(0)}) — expected cost below book median`,
      impact: +(demoNormalized - 1.0),
    });
  } else {
    drivers.push({
      category: "Demographic",
      text: `Book-typical age mix (avg ${avg_age.toFixed(0)}, median ${median_age}); expected cost ${(demoNormalized * 100).toFixed(0)}% of book`,
      impact: +(demoNormalized - 1.0),
    });
  }
  if (pct_female >= 0.60) {
    drivers.push({
      category: "Demographic",
      text: `Female-heavy mix (${(pct_female * 100).toFixed(0)}%) — higher utilization profile`,
      impact: +0.05,
    });
  } else if (pct_female <= 0.40) {
    drivers.push({
      category: "Demographic",
      text: `Male-heavy mix (${((1 - pct_female) * 100).toFixed(0)}%) — lower preventive utilization`,
      impact: -0.03,
    });
  }
  if (pct_medicare_cliff >= 0.10) {
    drivers.push({
      category: "Demographic",
      text: `${(pct_medicare_cliff * 100).toFixed(0)}% of group within 5 years of Medicare`,
      impact: +0.08 * pct_medicare_cliff,
    });
  }

  // Geographic — describe the county exposure regardless of magnitude.
  if (meanGeoZ >= 0.30) {
    drivers.push({
      category: "Geographic",
      text: `Members concentrated in counties ${meanGeoZ.toFixed(2)} SD above national chronic-disease mean`,
      impact: +(geoNormalized - 1.0),
    });
  } else if (meanGeoZ <= -0.20) {
    drivers.push({
      category: "Geographic",
      text: `Members in healthier-than-average counties (${meanGeoZ.toFixed(2)} SD below national mean)`,
      impact: +(geoNormalized - 1.0),
    });
  } else {
    drivers.push({
      category: "Geographic",
      text: `Geographic risk near national baseline (composite Z = ${meanGeoZ.toFixed(2)})`,
      impact: +(geoNormalized - 1.0),
    });
  }
  if (pct_top_county >= 0.40 && places.counties[top_county]) {
    const cz = places.counties[top_county].geo_z;
    const direction = cz > 0 ? "elevated-risk" : "lower-risk";
    drivers.push({
      category: "Geographic",
      text: `${(pct_top_county * 100).toFixed(0)}% concentrated in ${top_county_name} (${direction}, Z = ${cz.toFixed(2)})`,
      impact: +cz * 0.05,
    });
  }

  // Composition — group structure facts.
  if (employees.length < weights.small_group_threshold) {
    drivers.push({
      category: "Composition",
      text: `Small group (${employees.length} EE) — credibility/volatility load applied`,
      impact: +(weights.small_group_load - 1.0),
    });
  } else {
    drivers.push({
      category: "Composition",
      text: `Group size ${employees.length} EE — sufficient credibility for full-experience rating`,
      impact: 0,
    });
  }
  const totalHouseholds = tierMix.EE + tierMix.ECH + tierMix.ESP + tierMix.FAM;
  const famPct = totalHouseholds > 0
    ? (tierMix.FAM / totalHouseholds)
    : 0;
  if (famPct >= 0.30) {
    drivers.push({
      category: "Composition",
      text: `Family-tier heavy (${(famPct * 100).toFixed(0)}% FAM) — dependent claim volume risk`,
      impact: +0.04,
    });
  }

  // AI residual (if non-zero).
  if (aiResidualClamped !== 0) {
    drivers.push({
      category: "AI",
      text: `ML residual adjustment ${(aiResidualClamped * 100).toFixed(1)}% (calibrated against Kennion block)`,
      impact: aiResidualClamped,
    });
  }

  // Sort by absolute impact, keep top 5.
  drivers.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  const top_drivers = drivers.slice(0, 5);

  // ── 10. AI summary narrative ──────────────────────────────────────────
  const ai_summary = buildSummary({
    tier, kri, demo, geo, comp, top_county_name,
    avg_age, n: N, n_employees: employees.length,
    pct_medicare_cliff: cliff, pct_top_county: conc,
  });

  return {
    model_version: weights.version,
    model_hash: computeModelHash(meps, places, zipMap, weights),
    group: input.group,
    effective_date: eff.toISOString().slice(0, 10),
    scored_at: new Date().toISOString(),

    n_members: N,
    n_employees: employees.length,
    n_spouses: spouses.length,
    n_children: children.length,
    median_age,
    avg_age: round2(avg_age),
    pct_female: round4(pct_female),
    family_tier_mix: tierMix,
    top_county: top_county_name,
    pct_top_county: round4(pct_top_county),
    pct_medicare_cliff: round4(cliff),

    demographic: demo,
    geographic: geo,
    composition: comp,
    ai_residual: { raw: aiResidualRaw, clamped: aiResidualClamped, drivers: aiResidualDrivers },

    kri: round4(kri),
    tier,
    decision,

    top_drivers,
    ai_summary,
  };
}

function buildSummary(ctx: {
  tier: RiskTier; kri: number;
  demo: ComponentScore; geo: ComponentScore; comp: ComponentScore;
  top_county_name: string;
  avg_age: number; n: number; n_employees: number;
  pct_medicare_cliff: number; pct_top_county: number;
}): string {
  const parts: string[] = [];

  if (ctx.tier === "Preferred") {
    parts.push(`This group screens as Preferred (KRI ${ctx.kri.toFixed(2)}) — favorable for binding.`);
  } else if (ctx.tier === "Standard") {
    parts.push(`This group screens as Standard (KRI ${ctx.kri.toFixed(2)}) — typical risk profile for the Kennion book.`);
  } else {
    parts.push(`This group screens as High Risk (KRI ${ctx.kri.toFixed(2)}) — recommend declining the quote.`);
  }

  if (ctx.demo.normalized > 1.15) {
    parts.push(`Demographics are elevated: avg age ${ctx.avg_age.toFixed(0)} drives an MEPS-derived expected cost ${((ctx.demo.normalized - 1) * 100).toFixed(0)}% above book median.`);
  } else if (ctx.demo.normalized < 0.90) {
    parts.push(`Demographics are favorable: expected medical cost runs ${((1 - ctx.demo.normalized) * 100).toFixed(0)}% below book median.`);
  } else {
    parts.push(`Demographics are book-typical (avg age ${ctx.avg_age.toFixed(0)}).`);
  }

  if (ctx.geo.raw > 0.5) {
    parts.push(`Geographic risk is elevated — members concentrated in counties with above-average chronic-disease prevalence (top county: ${ctx.top_county_name}).`);
  } else if (ctx.geo.raw < -0.3) {
    parts.push(`Geographic risk is favorable — counties show below-average chronic-disease prevalence.`);
  }

  if (ctx.pct_medicare_cliff >= 0.15) {
    parts.push(`Medicare-cliff exposure is meaningful at ${(ctx.pct_medicare_cliff * 100).toFixed(0)}% of group.`);
  }

  if (ctx.tier === "High Risk") {
    parts.push(`Decision: DECLINE — do not advance to KAR.`);
  } else if (ctx.tier === "Standard" && (ctx.demo.normalized > 1.10 || ctx.geo.raw > 0.5)) {
    parts.push(`Recommend quoting with adverse-selection load.`);
  } else {
    parts.push(`Recommend quoting at standard pricing.`);
  }

  return parts.join(" ");
}

function round2(x: number): number { return Math.round(x * 100) / 100; }
function round4(x: number): number { return Math.round(x * 10000) / 10000; }

// ────────────────────────────────────────────────────────────────────────
// CensusEntry (Drizzle) adapter — same shape as rate-engine
// ────────────────────────────────────────────────────────────────────────
export function censusEntriesToScreenMembers(rows: CensusEntry[]): ScreenMember[] {
  return rows.map(r => ({
    relationship: r.relationship,
    firstName: r.firstName,
    lastName: r.lastName,
    dob: r.dateOfBirth,
    sex: r.gender,
    zip: r.zipCode || null,
  }));
}
