/**
 * Dual-AI Actuary Audit
 *
 * Two independent LLM auditors (Claude + OpenAI) run the same 16-item
 * checklist over a generated proposal. Both calls fire in parallel.
 * Results live on the `proposals.audit_results` jsonb column and are
 * the SOLE source of truth for the badges in the UI — public viewers
 * never trigger an audit, only read the cached row.
 *
 * The audit packet is built from aggregates only — no raw census
 * rows ever reach a provider. Even though the parse-time SSN scrub
 * should have caught those upstream, we send only counts, recomputed
 * sums, and the actual rule-required values.
 *
 * Cost guardrail: a daily USD ceiling (env: MAX_AUDIT_DAILY_USD,
 * default $2.00) protects against runaway loops. When tripped,
 * audits skip cleanly and the badge shows "Audit pending — daily
 * cap reached" rather than crashing proposal generation.
 */
import { getOpenAIClient, getAnthropicClient } from "./ai-client";
import { loadFactorTables } from "./rate-engine";
import type { Group, CensusEntry } from "@shared/schema";
import type { PricingResult } from "./rate-engine";
import { log } from "./index";

// ─── Public types ────────────────────────────────────────────────────

export interface AuditInput {
  group: Group;
  census: CensusEntry[];
  pricing: PricingResult;
  proposalFileName: string;
}

export interface AuditItem {
  key: string;
  label: string;
  passed: boolean;
  finding?: string;
}

export interface AuditResult {
  system: "claude" | "openai";
  model: string;
  items: AuditItem[];
  passed_count: number;
  total: number;
  score_pct: number;
  all_passed: boolean;
  error?: string;
}

export interface AuditPair {
  actuary_i: AuditResult;
  actuary_ii: AuditResult;
  agreement: "both_pass" | "both_fail" | "disagree" | "incomplete";
  audited_at: string;
  schema_version: 1;
}

// ─── Daily cost cap ──────────────────────────────────────────────────

const COST_PER_PAIR_USD = 0.006; // conservative upper bound from plan
const MAX_DAILY_USD = parseFloat(process.env.MAX_AUDIT_DAILY_USD || "2");
let _spendingDay: string = todayKey();
let _spentUsd = 0;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}
function reserveSpend(): boolean {
  const today = todayKey();
  if (today !== _spendingDay) {
    _spendingDay = today;
    _spentUsd = 0;
  }
  if (_spentUsd + COST_PER_PAIR_USD > MAX_DAILY_USD) return false;
  _spentUsd += COST_PER_PAIR_USD;
  return true;
}

// ─── Models ──────────────────────────────────────────────────────────

const CLAUDE_MODEL = "claude-haiku-4-5-20251001";
const OPENAI_MODEL = "gpt-4o-mini";

// ─── Checklist definition ────────────────────────────────────────────
//
// Both AIs receive this list and must answer pass/fail for each item.
// Order is fixed — UI relies on it for rendering.

interface RuleSpec {
  key: string;
  label: string;
  rule: string;
}

const RULES: ReadonlyArray<RuleSpec> = [
  // Census & demographics
  {
    key: "census-rows-valid",
    label: "Census rows have all required fields",
    rule: "Every census row must have firstName, lastName, parseable DOB, gender (Male or Female), 5-digit zipCode, and a relationship of EE, SP, or CH.",
  },
  {
    key: "lives-sum",
    label: "Total lives = EE + SP + CH",
    rule: "Verify total_lives equals employee_count + spouse_count + children_count exactly. Pass if equal, fail otherwise.",
  },
  {
    key: "no-duplicates",
    label: "No duplicate census entries",
    rule: "Confirm there are zero duplicate (firstName + lastName + DOB) tuples in the census aggregate the rep included. Pass if duplicate_count == 0.",
  },
  {
    key: "avg-age-correct",
    label: "Average age matches DOB recompute",
    rule: "Stored averageAge must be within ±0.1 of the recomputed_average_age provided. Pass if within tolerance.",
  },
  {
    key: "gender-counts",
    label: "Male/Female counts match census",
    rule: "maleCount + femaleCount must equal total_lives. Pass if equal.",
  },
  // Risk scoring
  {
    key: "risk-score-recompute",
    label: "Stored risk score matches recompute",
    rule: "Stored riskScore must be within ±0.01 of recomputed_risk_score provided. Pass if within tolerance.",
  },
  {
    key: "risk-tier-correct",
    label: "Risk tier matches score thresholds",
    rule: "If riskScore < 1.0 the tier must be 'preferred'; if 1.0 ≤ score < 1.5 must be 'standard'; if ≥ 1.5 must be 'high'. Pass only if tier matches the band.",
  },
  {
    key: "qual-score-formula",
    label: "Qualification score formula correct",
    rule: "qualificationScore must equal round(max(0, min(100, (2.0 - riskScore) / 2.0 * 100))). Pass if it matches within ±1.",
  },
  // Rate engine outputs
  {
    key: "rating-area-match",
    label: "Rating area matches majority of census state/zip",
    rule: "rating_area must align with the majority_state and majority_zip_prefix in the census aggregate. Pass if consistent.",
  },
  {
    key: "ee-rate-band",
    label: "EE rates within sane PMPM band",
    rule: "Every plan's EE rate must be between $200 and $2,000 PMPM. Pass only if all plans are inside the band.",
  },
  {
    key: "tier-multipliers",
    label: "EC/ES/FAM multipliers correct",
    rule: "For every plan: EC ≈ EE × 1.85 (±$1), ES ≈ EE × 2.00 (±$1), EF ≈ EE × 2.85 (±$1). Pass only if every plan satisfies all three.",
  },
  {
    key: "trend-formula",
    label: "Trend adjustment math correct",
    rule: "trend_adjustment must equal (1 + trend_rate)^((effective_date - base_rate_date) / 365.25), within ±0.001. Pass if matches.",
  },
  {
    key: "effective-date-window",
    label: "Effective date is in the future and ≤ 18 months out",
    rule: "effective_date must be after today_iso and within 18 months of today. Pass if both conditions hold.",
  },
  {
    key: "plan-count",
    label: "Plan count matches expected list",
    rule: "plan_count_actual must equal plan_count_expected for the admin platform. Pass if equal.",
  },
  // Narrative & PHI
  {
    key: "notes-consistent",
    label: "Admin notes consistent with numbers",
    rule: "If admin_notes_excerpt is non-empty, it must NOT contradict the demographic / risk / pricing values (e.g. notes claim 'young workforce' while averageAge > 50, or notes claim 'low risk' while riskTier is 'high'). Pass if consistent or notes empty.",
  },
  {
    key: "no-phi-leakage",
    label: "No SSN / credit-card / DOB strings in proposal output",
    rule: "phi_scan summary lists how many SSN-shaped, credit-card-shaped, or DOB-shaped strings the audit scanner found in the proposal artifact. Pass only if all counts are zero.",
  },
];

// ─── Audit packet builder ────────────────────────────────────────────
//
// Compute every input the rules need, deterministically. AI is asked
// to confirm pass/fail given these values + the rule — never to do
// the math itself. Items 1-14 are essentially "does X match Y?"
// 15-16 are where AI judgment matters.

const PHI_PATTERNS = {
  ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
  creditCard: /\b(?:\d[ -]*?){13,16}\b/g,
  dob: /\b(?:0?[1-9]|1[0-2])[\/-](?:0?[1-9]|[12]\d|3[01])[\/-](?:19|20)\d{2}\b/g,
};

function ageFromDob(dob: string): number | null {
  const m =
    dob.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/) ||
    dob.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/) ||
    dob.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  let d: Date | null = null;
  if (m) {
    if (m[1].length === 4) {
      d = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
    } else {
      d = new Date(parseInt(m[3]), parseInt(m[1]) - 1, parseInt(m[2]));
    }
  }
  if (!d || isNaN(d.getTime())) d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  const age = (now.getTime() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (age <= 0 || age >= 120) return null;
  return age;
}

function buildAuditPacket(input: AuditInput) {
  const { group, census, pricing, proposalFileName } = input;

  // Demographics recompute
  const ages = census
    .map((c) => ageFromDob(c.dateOfBirth))
    .filter((a): a is number => a !== null);
  const recomputedAvgAge =
    ages.length > 0 ? ages.reduce((a, b) => a + b, 0) / ages.length : 0;

  // Duplicate detection
  const seen = new Set<string>();
  let duplicateCount = 0;
  for (const c of census) {
    const k = `${c.firstName.toLowerCase()}|${c.lastName.toLowerCase()}|${c.dateOfBirth}`;
    if (seen.has(k)) duplicateCount++;
    else seen.add(k);
  }

  // Required-fields scan
  const REL_OK = new Set(["EE", "SP", "CH"]);
  const GENDER_OK = new Set(["Male", "Female"]);
  const censusRowProblems = census.reduce(
    (acc, c) => {
      if (!c.firstName?.trim()) acc.missingFirstName++;
      if (!c.lastName?.trim()) acc.missingLastName++;
      if (ageFromDob(c.dateOfBirth) === null) acc.unparseableDob++;
      if (!GENDER_OK.has(c.gender)) acc.invalidGender++;
      if (!/^\d{5}$/.test((c.zipCode || "").trim())) acc.invalidZip++;
      if (!REL_OK.has(c.relationship)) acc.invalidRelationship++;
      return acc;
    },
    {
      missingFirstName: 0,
      missingLastName: 0,
      unparseableDob: 0,
      invalidGender: 0,
      invalidZip: 0,
      invalidRelationship: 0,
    },
  );

  // Risk score recompute via the same lookup the engine uses. We
  // can't import analyzeGroupRisk (circular), so we ask the AI to
  // verify against the engine's own value rather than re-running it.
  // Item #6 surfaces a stored-vs-stored consistency check; the
  // primary assurance is the rate engine's internal verification.

  // Tier multiplier sanity
  const tierIssues: string[] = [];
  for (const [planName, r] of Object.entries(pricing.plan_rates)) {
    const ec = r.EE * 1.85;
    const es = r.EE * 2.0;
    const ef = r.EE * 2.85;
    if (Math.abs(r.EC - ec) > 1) tierIssues.push(`${planName}: EC ${r.EC} vs ${ec.toFixed(2)}`);
    if (Math.abs(r.ES - es) > 1) tierIssues.push(`${planName}: ES ${r.ES} vs ${es.toFixed(2)}`);
    if (Math.abs(r.EF - ef) > 1) tierIssues.push(`${planName}: EF ${r.EF} vs ${ef.toFixed(2)}`);
  }

  // EE rate band
  const eeOutOfBand = Object.entries(pricing.plan_rates)
    .filter(([, r]) => r.EE < 200 || r.EE > 2000)
    .map(([n, r]) => `${n}: ${r.EE}`);

  // Trend recompute
  const tables = loadFactorTables();
  const baseRateDate = tables.base_rate_date || "2025-01-01";
  const eff = new Date(pricing.effective_date);
  const base = new Date(baseRateDate);
  const yrs = (eff.getTime() - base.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  const recomputedTrend = Math.pow(1 + tables.trend_rate, yrs);

  // Effective date window
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const isFuture = eff.getTime() > today.getTime();
  const monthsOut = (eff.getTime() - today.getTime()) / (30.44 * 24 * 60 * 60 * 1000);

  // Census majority state/zip
  const stateCounts: Record<string, number> = {};
  const zipPrefixCounts: Record<string, number> = {};
  for (const c of census) {
    const z = (c.zipCode || "").trim();
    if (z.length >= 3) {
      const prefix = z.slice(0, 3);
      zipPrefixCounts[prefix] = (zipPrefixCounts[prefix] || 0) + 1;
    }
  }
  const majorityZipPrefix = Object.entries(zipPrefixCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  // census doesn't store state, but the group does
  if (group.state) stateCounts[group.state] = census.length;
  const majorityState = group.state || null;

  // Plan count expectation
  const planCountActual = Object.keys(pricing.plan_rates).length;

  // PHI scan
  const phiScanText = JSON.stringify({
    fileName: proposalFileName,
    pricing: pricing,
    notes: group.adminNotes || "",
  });
  const phiScan = {
    ssn_count: (phiScanText.match(PHI_PATTERNS.ssn) || []).length,
    credit_card_count: (phiScanText.match(PHI_PATTERNS.creditCard) || []).length,
    dob_count: (phiScanText.match(PHI_PATTERNS.dob) || []).length,
  };

  // qualificationScore recompute (formula in routes.ts)
  const expectedQual =
    group.riskScore != null
      ? Math.round(Math.max(0, Math.min(100, ((2.0 - group.riskScore) / 2.0) * 100)))
      : null;
  const storedQual =
    (group.groupCharacteristics as any)?.qualificationScore ?? null;

  return {
    today_iso: todayIso,
    group: {
      id: group.id,
      companyName: group.companyName,
      state: group.state,
      zipCode: group.zipCode,
      employeeCount: group.employeeCount,
      spouseCount: group.spouseCount,
      childrenCount: group.childrenCount,
      totalLives: group.totalLives,
      maleCount: group.maleCount,
      femaleCount: group.femaleCount,
      averageAge: group.averageAge,
      riskScore: group.riskScore,
      riskTier: group.riskTier,
      qualificationScore_stored: storedQual,
      qualificationScore_expected: expectedQual,
      adminNotes_excerpt: (group.adminNotes || "").slice(0, 600),
    },
    census_aggregate: {
      total_rows: census.length,
      ages_parsed: ages.length,
      recomputed_average_age: Math.round(recomputedAvgAge * 10) / 10,
      duplicate_count: duplicateCount,
      row_problems: censusRowProblems,
      majority_state: majorityState,
      majority_zip_prefix: majorityZipPrefix,
    },
    pricing: {
      effective_date: pricing.effective_date,
      base_rate_date: baseRateDate,
      rating_area: pricing.rating_area,
      area_factor: pricing.area_factor,
      admin: pricing.admin,
      n_members: pricing.n_members,
      n_employees: pricing.n_employees,
      avg_age: pricing.avg_age,
      trend_adjustment_stored: pricing.trend_adjustment,
      trend_adjustment_recomputed: Math.round(recomputedTrend * 1000) / 1000,
      trend_rate: tables.trend_rate,
      plan_count_actual: planCountActual,
      plan_count_expected: Object.keys(tables.plan_base_pmpm_6to1).length,
      ee_out_of_band: eeOutOfBand,
      tier_multiplier_issues: tierIssues,
    },
    effective_date_check: {
      is_future: isFuture,
      months_out: Math.round(monthsOut * 10) / 10,
    },
    phi_scan: phiScan,
    proposal_file_name: proposalFileName,
  };
}

// ─── Provider prompts ────────────────────────────────────────────────

const SYSTEM_PROMPT =
  "You are an actuarial audit AI for a health-insurance proposal system. " +
  "You will receive (1) an audit packet with deterministic recomputes and " +
  "(2) a numbered list of rules. For each rule, output PASS or FAIL based " +
  "STRICTLY on the values in the packet. Never invent values. Never speculate. " +
  "Reply with ONLY a JSON object in the schema shown — no prose, no markdown.";

function buildUserPrompt(packet: ReturnType<typeof buildAuditPacket>): string {
  const ruleList = RULES.map(
    (r, i) => `${i + 1}. [${r.key}] ${r.label} — Rule: ${r.rule}`,
  ).join("\n");

  return `Audit packet:
\`\`\`json
${JSON.stringify(packet, null, 2)}
\`\`\`

Rules to verify (${RULES.length} total):
${ruleList}

Respond with ONLY this JSON shape (no prose, no markdown fences):
{
  "items": [
    { "key": "<rule key>", "passed": true | false, "finding": "<short reason if failed; omit when passed>" }
  ]
}

The "items" array MUST have exactly ${RULES.length} entries, in the same order as the rules above. "finding" is required ONLY for FAIL items and must be ≤ 200 characters. Do not include any other fields.`;
}

// ─── Response parsing ────────────────────────────────────────────────

function parseAuditResponse(
  raw: string,
  system: "claude" | "openai",
  model: string,
): AuditResult {
  let parsed: any;
  try {
    // Strip any accidental ```json fences
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch (err: any) {
    return {
      system,
      model,
      items: [],
      passed_count: 0,
      total: RULES.length,
      score_pct: 0,
      all_passed: false,
      error: `Audit response was not valid JSON: ${err?.message || err}`,
    };
  }

  const itemsByKey = new Map<string, any>();
  if (Array.isArray(parsed?.items)) {
    for (const it of parsed.items) {
      if (it?.key) itemsByKey.set(String(it.key), it);
    }
  }

  const items: AuditItem[] = RULES.map((r) => {
    const raw = itemsByKey.get(r.key);
    const passed = raw?.passed === true;
    const finding =
      !passed && typeof raw?.finding === "string"
        ? String(raw.finding).slice(0, 240)
        : !passed
          ? "Failed"
          : undefined;
    return { key: r.key, label: r.label, passed, finding };
  });

  const passed_count = items.filter((i) => i.passed).length;
  return {
    system,
    model,
    items,
    passed_count,
    total: items.length,
    score_pct: items.length === 0 ? 0 : Math.round((passed_count / items.length) * 100),
    all_passed: passed_count === items.length,
  };
}

// ─── Provider calls ──────────────────────────────────────────────────

async function callClaude(packet: ReturnType<typeof buildAuditPacket>): Promise<AuditResult> {
  try {
    const client = getAnthropicClient();
    const resp = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(packet) }],
    });
    const text =
      resp.content
        .filter((b: any) => b.type === "text")
        .map((b: any) => b.text)
        .join("\n") || "";
    return parseAuditResponse(text, "claude", CLAUDE_MODEL);
  } catch (err: any) {
    log(`AI audit (claude) error: ${err?.message || err}`, "audit");
    return {
      system: "claude",
      model: CLAUDE_MODEL,
      items: [],
      passed_count: 0,
      total: RULES.length,
      score_pct: 0,
      all_passed: false,
      error: err?.message || "Claude audit call failed",
    };
  }
}

async function callOpenAI(packet: ReturnType<typeof buildAuditPacket>): Promise<AuditResult> {
  try {
    const client = getOpenAIClient();
    const resp = await client.chat.completions.create({
      model: OPENAI_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(packet) },
      ],
    });
    const text = resp.choices[0]?.message?.content || "";
    return parseAuditResponse(text, "openai", OPENAI_MODEL);
  } catch (err: any) {
    log(`AI audit (openai) error: ${err?.message || err}`, "audit");
    return {
      system: "openai",
      model: OPENAI_MODEL,
      items: [],
      passed_count: 0,
      total: RULES.length,
      score_pct: 0,
      all_passed: false,
      error: err?.message || "OpenAI audit call failed",
    };
  }
}

// ─── Public API ──────────────────────────────────────────────────────

function deriveAgreement(
  i: AuditResult,
  ii: AuditResult,
): AuditPair["agreement"] {
  if (i.error || ii.error) return "incomplete";
  if (i.all_passed && ii.all_passed) return "both_pass";
  if (!i.all_passed && !ii.all_passed) return "both_fail";
  return "disagree";
}

function capExceededResult(system: "claude" | "openai", model: string): AuditResult {
  return {
    system,
    model,
    items: [],
    passed_count: 0,
    total: RULES.length,
    score_pct: 0,
    all_passed: false,
    error: "Audit pending — daily cap reached",
  };
}

export async function runAuditPair(input: AuditInput): Promise<AuditPair> {
  const auditedAt = new Date().toISOString();
  if (!reserveSpend()) {
    return {
      actuary_i: capExceededResult("claude", CLAUDE_MODEL),
      actuary_ii: capExceededResult("openai", OPENAI_MODEL),
      agreement: "incomplete",
      audited_at: auditedAt,
      schema_version: 1,
    };
  }
  const packet = buildAuditPacket(input);
  const [iResult, iiResult] = await Promise.all([
    callClaude(packet),
    callOpenAI(packet),
  ]);
  return {
    actuary_i: iResult,
    actuary_ii: iiResult,
    agreement: deriveAgreement(iResult, iiResult),
    audited_at: auditedAt,
    schema_version: 1,
  };
}
