import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Group } from "@shared/schema";
import { tierConfig } from "../constants";

type AgeBucket = { label: string; count: number };

function deriveAgeBuckets(group: Group): AgeBucket[] {
  // Synthesized from averageAge + totalLives when we don't have per-person
  // census data on the group record. Labeled "est." in the UI so it's clear
  // these aren't exact counts.
  const total = group.totalLives ?? 0;
  const avg = group.averageAge ?? 40;
  const buckets: AgeBucket[] = [
    { label: "18–29", count: 0 },
    { label: "30–39", count: 0 },
    { label: "40–49", count: 0 },
    { label: "50–59", count: 0 },
    { label: "60+", count: 0 },
  ];
  if (total === 0) return buckets;
  // Rough centered bell around the average age.
  const centers = [24, 35, 45, 55, 65];
  const sigma = 9;
  const weights = centers.map((c) => Math.exp(-Math.pow((c - avg) / sigma, 2) / 2));
  const sumW = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = weights.map((w) => (w / sumW) * total);
  const rounded = raw.map((r) => Math.round(r));
  const diff = total - rounded.reduce((a, b) => a + b, 0);
  if (diff !== 0) {
    // Adjust the largest bucket to reconcile rounding.
    const idx = rounded.indexOf(Math.max(...rounded));
    rounded[idx] = Math.max(0, rounded[idx] + diff);
  }
  return buckets.map((b, i) => ({ ...b, count: rounded[i] }));
}

function StatCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <Card className="border-card-border p-4">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={cn("mt-2 text-[22px] font-bold leading-none tracking-tight", valueClassName)}>
        {value}
      </div>
    </Card>
  );
}

function HorizontalBar({
  label,
  count,
  max,
  suffix,
  estimated,
}: {
  label: string;
  count: number;
  max: number;
  suffix?: string;
  estimated?: boolean;
}) {
  const pct = max === 0 ? 0 : (count / max) * 100;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-[11px]">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">
          {estimated && "~"}
          {count}
          {suffix ? ` ${suffix}` : ""}
          {estimated && <span className="ml-1 text-[10px] uppercase">est.</span>}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary/70 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function OverviewTab({ group }: { group: Group }) {
  const tier = tierConfig(group.riskTier);
  const ageBuckets = deriveAgeBuckets(group);
  const maxAge = Math.max(1, ...ageBuckets.map((b) => b.count));
  const ee = group.employeeCount ?? 0;
  const sp = group.spouseCount ?? 0;
  const ch = group.childrenCount ?? 0;
  const enrollmentTotal = ee + sp + ch || 1;
  const male = group.maleCount ?? 0;
  const female = group.femaleCount ?? 0;
  const genderTotal = male + female || 1;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Lives" value={group.totalLives ?? 0} />
        <StatCard label="Employees" value={ee} />
        <StatCard
          label="Average Age"
          value={group.averageAge != null ? group.averageAge.toFixed(1) : "—"}
        />
        <StatCard
          label="Risk Score"
          value={group.riskScore != null ? group.riskScore.toFixed(2) : "—"}
          valueClassName={tier?.className}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-card-border p-5">
          <div className="flex items-baseline justify-between">
            <h3 className="font-semibold tracking-tight">Age Distribution</h3>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              estimated
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Synthesized from total lives and average age — clients' individual
            DOB values aren't stored on the group record.
          </p>
          <div className="mt-4 space-y-3">
            {ageBuckets.map((b) => (
              <HorizontalBar
                key={b.label}
                label={b.label}
                count={b.count}
                max={maxAge}
                estimated
              />
            ))}
          </div>
        </Card>

        <Card className="border-card-border p-5">
          <h3 className="font-semibold tracking-tight">Composition</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Enrollment relationship and gender split from the submitted census.
          </p>

          <div className="mt-5">
            <div className="mb-1 flex items-baseline justify-between text-[11px] font-medium">
              <span>Enrollment</span>
              <span className="text-muted-foreground">{enrollmentTotal} total</span>
            </div>
            <div className="flex h-7 w-full overflow-hidden rounded-md border border-card-border">
              {ee > 0 && (
                <div
                  className="flex items-center justify-center bg-blue-500/20 text-[10px] font-medium text-blue-700 dark:text-blue-400"
                  style={{ width: `${(ee / enrollmentTotal) * 100}%` }}
                >
                  {ee} EE
                </div>
              )}
              {sp > 0 && (
                <div
                  className="flex items-center justify-center bg-purple-500/20 text-[10px] font-medium text-purple-700 dark:text-purple-400"
                  style={{ width: `${(sp / enrollmentTotal) * 100}%` }}
                >
                  {sp} SP
                </div>
              )}
              {ch > 0 && (
                <div
                  className="flex items-center justify-center bg-green-500/20 text-[10px] font-medium text-green-700 dark:text-green-400"
                  style={{ width: `${(ch / enrollmentTotal) * 100}%` }}
                >
                  {ch} CH
                </div>
              )}
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-1 flex items-baseline justify-between text-[11px] font-medium">
              <span>Gender</span>
              <span className="text-muted-foreground">{male + female} total</span>
            </div>
            <div className="flex h-7 w-full overflow-hidden rounded-md border border-card-border">
              {male > 0 && (
                <div
                  className="flex items-center justify-center bg-blue-500/20 text-[10px] font-medium text-blue-700 dark:text-blue-400"
                  style={{ width: `${(male / genderTotal) * 100}%` }}
                >
                  {male} M
                </div>
              )}
              {female > 0 && (
                <div
                  className="flex items-center justify-center bg-purple-500/20 text-[10px] font-medium text-purple-700 dark:text-purple-400"
                  style={{ width: `${(female / genderTotal) * 100}%` }}
                >
                  {female} F
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
