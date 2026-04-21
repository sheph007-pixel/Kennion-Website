/**
 * Kennion Rate Engine (TypeScript).
 *
 * Deterministic port of the actuary's "Kennion Actuarial Rater.xlsm" RBP
 * composite rating math. Reads factor tables from ./factor-tables.json (which
 * is regenerated from the .xlsm by scripts/sync-rater.py).
 *
 * Runs in-process — no LibreOffice, no VBA, no shell-out.
 *
 * Public API:
 *   priceGroup(census, effectiveDate, ratingArea, admin?) -> PricingResult
 *
 * Pricing formula (matches the actuary's composite convention):
 *   member_PMPM        = base_PMPM[plan] × ageFactor[age] × areaFactor[area]
 *   group_EE_rate      = avg over employees of member_PMPM × trend_adj
 *   group_{EC/ES/EF}   = group_EE_rate × tier_multiplier   (1.85 / 2.00 / 2.85)
 *   trend_adj          = (1 + trend_rate) ^ (years from base_rate_date to eff)
 */
import fs from "fs";
import path from "path";
import type { CensusEntry } from "@shared/schema";

// ─── Types ────────────────────────────────────────────────────────────────

export interface FactorTables {
  version: string;
  source_file: string;
  source_sha256: string;
  synced_at: string;
  age_factors: Record<string, number>;       // JSON keys come back as strings
  area_factors: Record<string, number | null>;
  tier_factors_default: { EE: number; ECH: number; ESP: number; FAM: number };
  plan_base_pmpm_6to1: Record<string, {
    total_margin: number;
    base_3to1?: number | null;
    claims_unadjusted?: number | null;
    agg_sl_adj?: number | null;
  }>;
  trend_rate: number;
  phic_stoploss?: number;
  fixed_expense_pct?: number;
  expense_pepm?: Record<string, number | null>;
}

export interface CensusMember {
  relationship: string;     // Employee | Spouse | Child | Dependent
  firstName?: string;
  lastName?: string;
  dob: string | Date;       // ISO string, MM/DD/YYYY, or Date
  sex?: string | null;
  state?: string | null;
  zip?: string | null;
}

export type RatingArea =
  | "Birmingham" | "Huntsville" | "Montgomery"
  | "Alabama Other Area" | "Out-of-State"
  | "auto";

export type Admin =
  | "EBPA" | "HEALTHEZ" | "Virtual_RBP" | "Virtual_RBP_HEALTHEZ";

export interface PriceGroupInput {
  census: CensusMember[];
  effectiveDate: string | Date;
  ratingArea?: RatingArea;
  admin?: Admin;
  baseRateDate?: string | Date;     // defaults to 2025-01-01
  group?: string;                   // echoed back in output
}

export interface PlanRate { EE: number; EC: number; ES: number; EF: number; }

export interface PricingResult {
  engine_version: string;
  factor_tables_version: string;
  factor_tables_sha256: string;
  group?: string;
  effective_date: string;
  rating_area: string;
  area_factor: number;
  admin: Admin;
  trend_adjustment: number;
  n_members: number;
  n_employees: number;
  avg_age: number;
  group_age_factor_ee: number;
  all_member_avg_age_factor: number;
  tier_factors: { EE: number; ECH: number; ESP: number; FAM: number };
  plan_rates: Record<string, PlanRate>;
}

// ─── Factor table loading ─────────────────────────────────────────────────

// Default location: ./server/factor-tables.json relative to the process cwd.
// Works in both dev (tsx, cwd = repo root) and prod (node dist/index.cjs,
// cwd = repo root on Railway).
const DEFAULT_TABLES_PATH = path.resolve(process.cwd(), "server", "factor-tables.json");

let _cachedTables: FactorTables | null = null;
let _cachedTablesPath: string | null = null;

export function loadFactorTables(p?: string): FactorTables {
  const tablesPath = p || DEFAULT_TABLES_PATH;
  if (_cachedTables && _cachedTablesPath === tablesPath) return _cachedTables;
  const raw = fs.readFileSync(tablesPath, "utf8");
  const parsed = JSON.parse(raw) as FactorTables;
  _cachedTables = parsed;
  _cachedTablesPath = tablesPath;
  return parsed;
}

export function reloadFactorTables(p?: string): FactorTables {
  _cachedTables = null;
  _cachedTablesPath = null;
  return loadFactorTables(p);
}

// ─── Date & age ───────────────────────────────────────────────────────────

function parseDate(d: string | Date): Date {
  if (d instanceof Date) return d;
  const s = String(d).trim();
  // Try ISO (YYYY-MM-DD) first, then US formats.
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
  let years = eff.getFullYear() - dob.getFullYear();
  if (eff.getMonth() < dob.getMonth() ||
      (eff.getMonth() === dob.getMonth() && eff.getDate() < dob.getDate())) {
    years--;
  }
  return Math.max(0, years);
}

function relCode(rel: string): "EE" | "SP" | "CH" {
  const r = (rel || "").trim().toLowerCase();
  if (r.startsWith("emp")) return "EE";
  if (r.startsWith("sp")) return "SP";
  return "CH";
}

// ─── Area inference ────────────────────────────────────────────────────────

export function inferRatingArea(state?: string | null, zip?: string | null): RatingArea {
  const st = (state || "").trim().toUpperCase();
  const z = (zip || "").trim().slice(0, 3);
  // Explicit non-AL state wins even if zip looks AL-ish.
  if (st && st !== "AL") return "Out-of-State";
  // Zip-only inference: AL zips are in the 350-369 range.
  const z3 = parseInt(z, 10);
  if (!st && (isNaN(z3) || z3 < 350 || z3 > 369)) return "Out-of-State";
  if (["350", "351", "352"].includes(z)) return "Birmingham";
  if (["358", "359"].includes(z)) return "Huntsville";
  if (["360", "361"].includes(z)) return "Montgomery";
  return "Alabama Other Area";
}

export function inferRatingAreaFromCensus(census: CensusMember[]): RatingArea {
  for (const m of census) {
    if (relCode(m.relationship) === "EE" && m.state) {
      return inferRatingArea(m.state, m.zip);
    }
  }
  for (const m of census) {
    if (m.state || m.zip) return inferRatingArea(m.state, m.zip);
  }
  return "Alabama Other Area";
}

// ─── Factor lookups ────────────────────────────────────────────────────────

function ageFactor(tables: FactorTables, age: number): number {
  const direct = tables.age_factors[String(age)];
  if (typeof direct === "number") return direct;
  const ages = Object.keys(tables.age_factors).map(k => parseInt(k, 10)).sort((a, b) => a - b);
  if (!ages.length) return 1;
  if (age >= ages[ages.length - 1]) return tables.age_factors[String(ages[ages.length - 1])];
  // Fall back to largest key ≤ age
  let best = ages[0];
  for (const a of ages) if (a <= age) best = a;
  return tables.age_factors[String(best)];
}

function areaFactor(tables: FactorTables, area: string): number {
  const v = tables.area_factors[area];
  if (typeof v === "number") return v;
  const oos = tables.area_factors["Out-of-State"];
  return typeof oos === "number" ? oos : 1.08;
}

function trendAdjustment(tables: FactorTables, base: Date, eff: Date): number {
  const days = (eff.getTime() - base.getTime()) / (1000 * 60 * 60 * 24);
  const years = days / 365.25;
  return Math.pow(1 + (tables.trend_rate ?? 0.07), years);
}

// ─── Pricing ──────────────────────────────────────────────────────────────

export function priceGroup(
  input: PriceGroupInput,
  tablesOverride?: FactorTables,
): PricingResult {
  const tables = tablesOverride || loadFactorTables();
  const eff = parseDate(input.effectiveDate);
  const baseDate = parseDate(input.baseRateDate ?? "2025-01-01");
  const admin = input.admin ?? "EBPA";

  const area: RatingArea = !input.ratingArea || input.ratingArea === "auto"
    ? inferRatingAreaFromCensus(input.census)
    : input.ratingArea;

  const areaF = areaFactor(tables, area);
  const trend = trendAdjustment(tables, baseDate, eff);
  const tier = tables.tier_factors_default;

  const members = input.census.map(m => ({
    ...m,
    _dob: parseDate(m.dob),
    _rel: relCode(m.relationship),
  }));
  const employees = members.filter(m => m._rel === "EE");
  if (employees.length === 0) {
    throw new Error("Census has no employees; cannot compute composite rate");
  }

  const eeAgeFactors = employees.map(m => ageFactor(tables, ageAsOf(m._dob, eff)));
  const groupEEAgeFactor = eeAgeFactors.reduce((s, x) => s + x, 0) / eeAgeFactors.length;

  const allFactors = members.map(m => ageFactor(tables, ageAsOf(m._dob, eff)));
  const allAvgFactor = allFactors.reduce((s, x) => s + x, 0) / allFactors.length;

  const avgAge = members.reduce((s, m) => s + ageAsOf(m._dob, eff), 0) / members.length;

  const plan_rates: Record<string, PlanRate> = {};
  for (const [plan, comps] of Object.entries(tables.plan_base_pmpm_6to1)) {
    const base = comps.total_margin;
    if (typeof base !== "number" || !(base > 0)) continue;
    const ee = base * groupEEAgeFactor * areaF * trend;
    plan_rates[plan] = {
      EE: round2(ee),
      EC: round2(ee * tier.ECH),
      ES: round2(ee * tier.ESP),
      EF: round2(ee * tier.FAM),
    };
  }

  return {
    engine_version: "1.0",
    factor_tables_version: tables.version,
    factor_tables_sha256: tables.source_sha256,
    group: input.group,
    effective_date: eff.toISOString().slice(0, 10),
    rating_area: area,
    area_factor: areaF,
    admin,
    trend_adjustment: round5(trend),
    n_members: members.length,
    n_employees: employees.length,
    avg_age: round2(avgAge),
    group_age_factor_ee: round5(groupEEAgeFactor),
    all_member_avg_age_factor: round5(allAvgFactor),
    tier_factors: tier,
    plan_rates,
  };
}

function round2(x: number): number { return Math.round(x * 100) / 100; }
function round5(x: number): number { return Math.round(x * 1e5) / 1e5; }

// ─── CensusEntry (Drizzle schema) adapter ─────────────────────────────────

/** Convert the Drizzle `census_entries` row shape into the engine's
 *  CensusMember shape. */
export function censusEntriesToMembers(rows: CensusEntry[]): CensusMember[] {
  return rows.map(r => ({
    relationship: r.relationship,
    firstName: r.firstName,
    lastName: r.lastName,
    dob: r.dateOfBirth,
    sex: r.gender,
    state: null,            // not stored on census_entries in current schema
    zip: r.zipCode || null,
  }));
}
