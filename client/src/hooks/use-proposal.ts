import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Group, CensusEntry } from "@shared/schema";
import type { MedicalPlan, TierKey } from "@/lib/kennion-rates";

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

// Live-priced medical plans for a group at a given effective date. The
// server returns `plan_rates: { planName: { EE, EC, ES, EF } }` where keys
// correspond to EE / EE+CH / EE+SP / EE+FAM. Normalize to the client's
// tier shape and produce a list ordered by EE rate (most expensive first,
// matching the design's default sort).
export function useGroupRates(groupId: string | undefined, effectiveDate: string | null) {
  return useQuery<{ plans: MedicalPlan[]; result: RateEngineResult }>({
    queryKey: ["/api/rate/price-group", groupId, effectiveDate],
    queryFn: async () => {
      const res = await apiRequest("POST", `/api/rate/price-group/${groupId}`, {
        effective_date: effectiveDate,
      });
      const result = (await res.json()) as RateEngineResult;
      const plans: MedicalPlan[] = Object.entries(result.plan_rates)
        .map(([name, r]) => ({
          id: slugifyPlanName(name),
          name,
          base: {
            EE: r.EE,
            EE_CH: r.EC,
            EE_SP: r.ES,
            EE_FAM: r.EF,
          } as Record<TierKey, number>,
        }))
        .sort((a, b) => b.base.EE - a.base.EE);
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
