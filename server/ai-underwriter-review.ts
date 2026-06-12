/**
 * Claude AI Underwriter Review — ADVISORY ONLY.
 *
 * Runs after screenGroup() and gives the admin a structured second opinion
 * on the deterministic Kennion Risk Screen result: does an experienced
 * underwriter's read of the drivers agree with the tier, and is there
 * anything a human should look at before quoting?
 *
 * Hard rules (do not "enhance" these away):
 *  - The output NEVER changes kri / tier / decision / groups.riskTier or
 *    any gating. The deterministic screen is the sole accept/decline gate.
 *  - Only AGGREGATE ScreenResult fields are sent to the API — counts,
 *    ages, percentages, driver text. Never census rows, names, DOBs,
 *    or per-member data (see CLAUDE.md sensitive-data rules).
 *  - Failure is non-fatal: missing ANTHROPIC_API_KEY, API errors, or a
 *    refusal on both models all return null and the screen persists
 *    exactly as it does today.
 *
 * Model upgrades: change PRIMARY_MODEL when a newer Claude model ships.
 */
import { getAnthropicClient, anthropicAvailable } from "./anthropic-client";
import { loadScreenTables, type ScreenResult } from "./risk-screen";

// Local logger (not `log` from ./index): importing the server entry would
// boot the app when this module is loaded standalone (tests, scripts).
function log(message: string) {
  console.log(`[underwriter-review] ${message}`);
}

const PRIMARY_MODEL = "claude-fable-5";
// Fable 5's safety classifiers can (rarely) decline a benign request with
// stop_reason "refusal". When that happens we retry once on Opus.
const FALLBACK_MODEL = "claude-opus-4-8";
const REQUEST_TIMEOUT_MS = 60_000;

export interface UnderwriterReview {
  verdict: "CONCUR" | "FLAG_FOR_REVIEW"; // concur with the deterministic tier, or recommend a human look
  confidence: "high" | "medium" | "low";
  narrative: string;        // underwriter-voice assessment
  key_concerns: string[];   // specific, driver-grounded concerns (may be empty)
  borderline: boolean;      // KRI sits near a tier threshold
  model: string;            // which model actually served the review
  reviewed_at: string;      // ISO timestamp
}

// Structured-outputs schema: guarantees the response parses into the shape
// above (structured outputs require additionalProperties: false throughout).
const REVIEW_SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["CONCUR", "FLAG_FOR_REVIEW"] },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    narrative: {
      type: "string",
      description:
        "ONE short paragraph (3-5 sentences) in a senior underwriter's voice: whether the tier is the right call and the single most important thing a human should know. Do not restate component scores or counts already shown to the admin.",
    },
    key_concerns: {
      type: "array",
      items: { type: "string" },
      description:
        "At most 3 short, specific concerns grounded in the provided drivers/projections. Empty if none.",
    },
    borderline: { type: "boolean" },
  },
  required: ["verdict", "confidence", "narrative", "key_concerns", "borderline"],
  additionalProperties: false,
} as const;

// Directionality is stated explicitly because an earlier LLM narrative
// (gpt-4o-mini score review, see server/ai-analysis.ts) produced
// direction-reversed text when the prompt left it implicit.
const SYSTEM_PROMPT = `You are a senior group-health underwriter at Kennion reviewing the output of the deterministic Kennion Risk Screen (KRS). Your review is ADVISORY: the deterministic tier is the binding decision, and your job is to say whether you concur and what a human underwriter should double-check.

How to read the numbers:
- The Kennion Risk Index (KRI) is calibrated so 1.00 = the book median. HIGHER is WORSE (more expected cost), lower is better.
- Tier thresholds: KRI below the preferred threshold = Preferred (quote), below the high-risk threshold = Standard (quote), at or above it = High Risk (decline). Both thresholds are given in the input.
- Component scores (demographic, geographic, composition) are normalized the same way: above 1.00 pushes cost up, below 1.00 pulls it down.
- Driver "impact" values: positive = increases risk, negative = decreases risk.
- predicted_pmpm vs book_mean_pmpm: predicted above book mean = adverse.
- plan_projections loss_ratio: predicted claims / premium funding. Above 1.00 = the plan would lose money on this group.

Verdict guidance:
- "CONCUR" when the components, drivers, and projections coherently support the tier.
- "FLAG_FOR_REVIEW" only when the RISK picture deserves a human look before relying on the tier: KRI within ~0.10 of a threshold, components pointing in strongly conflicting directions, a single driver dominating the composite, loss ratios that contradict the tier, very small groups where one life swings the math, or heavy concentration risk (age cliff, single county).
- Do NOT flag or comment on census data quality, enrollment-data reconciliation, or apparent inconsistencies between counts - the census is validated upstream and some derived aggregates are approximations. Judge the risk, not the data plumbing.
- Set "borderline" true whenever the KRI is within ~0.10 of either threshold, regardless of verdict.

Write in plain professional English, grounded only in the data provided. Never invent member-level facts - you are given aggregates only. Be brief: ONE paragraph of 3-5 sentences, at most 3 key concerns. The admin already sees the score, tier, component bars, and drivers - add judgment, not a recap.`;

// Whitelist of aggregate fields sent to the API. Building the payload by
// explicit field selection (rather than passing the whole ScreenResult)
// keeps any future member-level additions to ScreenResult out of the
// request by default.
function buildReviewInput(s: ScreenResult) {
  const { weights } = loadScreenTables();
  return {
    kri: s.kri,
    tier: s.tier,
    decision: s.decision,
    thresholds: {
      preferred_below: weights.thresholds.preferred,
      high_risk_at_or_above: weights.thresholds.high_risk,
    },
    model_version: s.model_version,
    effective_date: s.effective_date,
    group_profile: {
      n_members: s.n_members,
      n_employees: s.n_employees,
      n_spouses: s.n_spouses,
      n_children: s.n_children,
      median_age: s.median_age,
      avg_age: s.avg_age,
      pct_female: s.pct_female,
      // family_tier_mix is intentionally excluded: it's derived from census
      // row-order household chaining and is unreliable when rows aren't
      // grouped by household — feeding it to the model produced false
      // "data integrity" flags.
      top_county: s.top_county,
      pct_top_county: s.pct_top_county,
      pct_medicare_cliff: s.pct_medicare_cliff,
    },
    components: {
      demographic: { normalized: s.demographic.normalized, drivers: s.demographic.drivers },
      geographic: { normalized: s.geographic.normalized, drivers: s.geographic.drivers },
      composition: { normalized: s.composition.normalized, drivers: s.composition.drivers },
      ai_residual: { clamped: s.ai_residual.clamped, drivers: s.ai_residual.drivers },
    },
    top_drivers: s.top_drivers,
    forecast: {
      predicted_pmpm: s.predicted_pmpm,
      predicted_pepm: s.predicted_pepm,
      predicted_annual_claims: s.predicted_annual_claims,
      book_mean_pmpm: s.book_mean_pmpm,
    },
    plan_projections: s.plan_projections,
  };
}

class RefusalError extends Error {
  constructor() { super("model refused the request"); }
}

async function callModel(model: string, screen: ScreenResult): Promise<UnderwriterReview> {
  const client = getAnthropicClient();
  const response = await client.messages.create(
    {
      model,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      // No `thinking` param: Fable 5 has thinking always on and rejects
      // explicit config. No temperature/top_p: removed on this model family.
      output_config: {
        effort: "medium", // small structured-judgment task on a synchronous path
        format: { type: "json_schema", schema: REVIEW_SCHEMA as any },
      },
      messages: [
        {
          role: "user",
          content:
            "Review this Kennion Risk Screen result and return your structured underwriter review.\n\n" +
            JSON.stringify(buildReviewInput(screen)),
        },
      ],
    },
    { timeout: REQUEST_TIMEOUT_MS },
  );

  if (response.stop_reason === "refusal") throw new RefusalError();

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("no text content in model response");
  }
  const parsed = JSON.parse(textBlock.text);
  if (
    (parsed.verdict !== "CONCUR" && parsed.verdict !== "FLAG_FOR_REVIEW") ||
    !["high", "medium", "low"].includes(parsed.confidence) ||
    typeof parsed.narrative !== "string" || parsed.narrative.trim() === "" ||
    !Array.isArray(parsed.key_concerns) ||
    typeof parsed.borderline !== "boolean"
  ) {
    throw new Error("model response failed shape validation");
  }
  return {
    verdict: parsed.verdict,
    confidence: parsed.confidence,
    narrative: parsed.narrative.trim(),
    key_concerns: parsed.key_concerns.map((c: unknown) => String(c)).filter(Boolean),
    borderline: parsed.borderline,
    model: response.model,
    reviewed_at: new Date().toISOString(),
  };
}

export async function generateUnderwriterReview(
  screen: ScreenResult,
): Promise<UnderwriterReview | null> {
  if (!anthropicAvailable()) return null;
  try {
    return await callModel(PRIMARY_MODEL, screen);
  } catch (err: any) {
    if (err instanceof RefusalError) {
      try {
        return await callModel(FALLBACK_MODEL, screen);
      } catch (fallbackErr: any) {
        log(`fallback (${FALLBACK_MODEL}) failed: ${fallbackErr?.message || fallbackErr}`);
        return null;
      }
    }
    log(`${PRIMARY_MODEL} failed: ${err?.message || err}`);
    return null;
  }
}
