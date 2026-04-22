import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Group, CensusEntry } from "@shared/schema";
import type { MedicalPlan, TierKey } from "@/lib/kennion-rates";

type CensusRowInput = Pick<
  CensusEntry,
  "firstName" | "lastName" | "dateOfBirth" | "gender" | "zipCode" | "relationship"
>;

type RawPlanRate = { EE: number; EC: number; ES: number; EF: number };
type RateEngineResult = {
  engine_version: string;
  factor_tables_version: string;
  rating_area: string;
  effective_date: string;
  trend_adjustment: number;
  n_members: number;
  n_employees: number;
  avg_age: number;
  group_age_factor_ee: number;
  plan_rates: Record<string, RawPlanRate>;
};

// The user's group. Today the customer portal is "one group per user", so
// we surface just the first entry. When the API grows a /api/groups/current
// endpoint we should swap to that.
export function useCurrentGroup() {
  const query = useQuery<Group[]>({ queryKey: ["/api/groups"] });
  const group = query.data?.[0] ?? null;
  return { ...query, group };
}

// Replaces the entire roster for a group. On success, refreshes every
// query that derives from the census — the group record (for stat cards +
// tier + score), the census entries (modal), and the medical rates
// (since the per-tier mix drives Monthly Total).
export function useReplaceCensus(groupId: string | undefined) {
  return useMutation({
    mutationFn: async (entries: CensusRowInput[]) => {
      if (!groupId) throw new Error("groupId required");
      const res = await apiRequest("POST", `/api/groups/${groupId}/census`, { entries });
      return (await res.json()) as { group: Group; entries: CensusEntry[] };
    },
    onSuccess: () => {
      if (!groupId) return;
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, "census"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rate/price-group", groupId] });
    },
  });
}

export function useGroupCensus(groupId: string | undefined) {
  return useQuery<CensusEntry[]>({
    queryKey: ["/api/groups", groupId, "census"],
    queryFn: async () => {
      const res = await fetch(`/api/groups/${groupId}/census`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load census");
      return res.json();
    },
    enabled: Boolean(groupId),
  });
}

// Canonical display order + metadata for the medical plans we surface in
// the customer proposal. The server rate engine returns many plans (some
// legacy / admin-only — e.g. Virtual_RBP variants), so we filter to this
// list in this exact order. Keys are the plan names as they appear in the
// actuary's workbook; if the actuary renames a plan the match will fall
// through and the plan simply won't render until the map is updated.
const MEDICAL_PLAN_ORDER: { serverName: string; displayName?: string; tier: string; note?: string }[] = [
  { serverName: "Deluxe Platinum", tier: "Platinum" },
  { serverName: "Choice Gold", tier: "Gold" },
  { serverName: "Basic Gold", tier: "Gold" },
  { serverName: "Preferred Silver", tier: "Silver" },
  { serverName: "Enhanced Silver", tier: "Silver" },
  { serverName: "Classic Silver", tier: "Silver" },
  { serverName: "Saver HSA", tier: "Silver", note: "Health Savings Account" },
  { serverName: "Elite Health Plan", displayName: "Elite Health", tier: "Bronze" },
  { serverName: "Premier Health Plan", displayName: "Premier Health", tier: "Bronze" },
  { serverName: "Select Health Plan", displayName: "Select Health", tier: "Bronze" },
  { serverName: "Core Health Plan", displayName: "Core Health", tier: "Bronze" },
  { serverName: "Freedom Platinum", tier: "Generic Rx", note: "Generic Rx" },
  { serverName: "Freedom Gold", tier: "Generic Rx", note: "Generic Rx" },
  { serverName: "Freedom Silver", tier: "Generic Rx", note: "Generic Rx" },
  { serverName: "Freedom Bronze", tier: "Generic Rx", note: "Generic Rx" },
];

// Live-priced medical plans for a group at a given effective date. The
// server returns `plan_rates: { planName: { EE, EC, ES, EF } }` where keys
// correspond to EE / EE+CH / EE+SP / EE+FAM. We filter to MEDICAL_PLAN_ORDER
// and render in that exact sequence — any plan the engine returns that
// isn't in the list (admin-only / legacy plans) is suppressed.
export function useGroupRates(groupId: string | undefined, effectiveDate: string | null) {
  return useQuery<{ plans: MedicalPlan[]; result: RateEngineResult }>({
    queryKey: ["/api/rate/price-group", groupId, effectiveDate],
    queryFn: async () => {
      const res = await apiRequest("POST", `/api/rate/price-group/${groupId}`, {
        effective_date: effectiveDate,
      });
      const result = (await res.json()) as RateEngineResult;
      const plans: MedicalPlan[] = [];
      for (const entry of MEDICAL_PLAN_ORDER) {
        const r = result.plan_rates[entry.serverName];
        if (!r) continue;
        plans.push({
          id: slugifyPlanName(entry.serverName),
          name: entry.displayName ?? entry.serverName,
          tier: entry.tier,
          note: entry.note,
          base: {
            EE: r.EE,
            EE_CH: r.EC,
            EE_SP: r.ES,
            EE_FAM: r.EF,
          } as Record<TierKey, number>,
        });
      }
      return { plans, result };
    },
    enabled: Boolean(groupId && effectiveDate),
  });
}

function slugifyPlanName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Derive the census tier mix (EE / EE_CH / EE_SP / EE_FAM counts) from a
// flat list of census entries. Each employee is attributed to a tier based
// on the spouses and children attached to them.
export function censusToMix(entries: CensusEntry[] | undefined) {
  const mix = { EE: 0, EE_CH: 0, EE_SP: 0, EE_FAM: 0 };
  if (!entries) return mix;

  // Walk the roster in order; each new EE starts a new family.
  let current: { hasSpouse: boolean; hasChild: boolean } | null = null;
  const families: { hasSpouse: boolean; hasChild: boolean }[] = [];
  const rel = (r?: string) => (r || "").toLowerCase();
  for (const e of entries) {
    const r = rel(e.relationship);
    if (r === "ee" || r === "employee") {
      current = { hasSpouse: false, hasChild: false };
      families.push(current);
    } else if (r === "sp" || r === "spouse") {
      if (current) current.hasSpouse = true;
    } else if (r === "ch" || r === "child") {
      if (current) current.hasChild = true;
    }
  }

  for (const f of families) {
    if (f.hasSpouse && f.hasChild) mix.EE_FAM++;
    else if (f.hasSpouse) mix.EE_SP++;
    else if (f.hasChild) mix.EE_CH++;
    else mix.EE++;
  }
  return mix;
}
