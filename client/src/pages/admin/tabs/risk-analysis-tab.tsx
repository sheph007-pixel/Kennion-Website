import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import type { Group } from "@shared/schema";
import { tierConfig } from "../constants";

function estimatedFactors(group: Group): Array<{ label: string; weight: number }> {
  // Synthesized estimates — we don't store actuarial factor breakdowns on
  // the group row. These percentages are derived from the overall risk
  // score so the visualisation gives a directionally correct snapshot.
  const score = group.riskScore ?? 1;
  const base = score / 1.5;
  const femaleRatio =
    (group.femaleCount ?? 0) /
    Math.max(1, (group.maleCount ?? 0) + (group.femaleCount ?? 0));
  const depRatio =
    ((group.spouseCount ?? 0) + (group.childrenCount ?? 0)) /
    Math.max(1, group.totalLives ?? 1);
  return [
    { label: "Age factor", weight: Math.min(1, base * 0.9 + ((group.averageAge ?? 40) - 35) / 60) },
    { label: "Gender mix", weight: Math.min(1, base * 0.8 + femaleRatio * 0.3) },
    { label: "Family composition", weight: Math.min(1, base * 0.7 + depRatio * 0.4) },
    { label: "Industry class", weight: Math.min(1, base * 0.85) },
    { label: "Geography", weight: Math.min(1, base * 0.75) },
  ];
}

export function RiskAnalysisTab({ group }: { group: Group }) {
  const score = group.riskScore;
  const tier = tierConfig(group.riskTier);
  const pct = score != null ? Math.min(100, (score / 1.5) * 100) : 0;
  const factors = estimatedFactors(group);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <Card className="border-card-border p-5">
        <h3 className="font-semibold tracking-tight">Risk Score Breakdown</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Overall score on a 0 → 1.5 scale with carrier tier thresholds marked.
        </p>

        <div className="mt-5">
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "absolute left-0 top-0 h-full rounded-full transition-all",
                tier?.className ? "bg-current" : "bg-primary",
                tier?.className,
              )}
              style={{ width: `${pct}%` }}
            />
            <div
              className="absolute top-0 h-full w-px bg-foreground/30"
              style={{ left: `${(0.85 / 1.5) * 100}%` }}
            />
            <div
              className="absolute top-0 h-full w-px bg-foreground/30"
              style={{ left: `${(1.15 / 1.5) * 100}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
            <span>Preferred &lt; 0.85</span>
            <span>Standard 0.85–1.15</span>
            <span>High &gt; 1.15</span>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Info className="h-3 w-3" />
          Factor weights below are <span className="ml-1 font-medium">estimated</span> from
          the overall score; exact actuarial inputs aren't stored per-group.
        </div>

        <div className="mt-3 space-y-3">
          {factors.map((f) => (
            <div key={f.label}>
              <div className="mb-1 flex items-baseline justify-between text-[11px]">
                <span className="font-medium">{f.label}</span>
                <span className="text-muted-foreground">~{(f.weight * 100).toFixed(0)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/70"
                  style={{ width: `${Math.min(100, f.weight * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col items-center justify-center border-card-border p-6">
        <div
          className={cn(
            "text-[52px] font-bold leading-none tracking-[-0.02em]",
            tier?.className ?? "text-foreground",
          )}
        >
          {score != null ? score.toFixed(2) : "—"}
        </div>
        <div className="mt-3 text-sm font-medium">{tier?.label ?? "Unscored"}</div>
        <p className="mt-4 max-w-xs text-center text-xs text-muted-foreground">
          {tier?.label === "Preferred Risk" &&
            "This group scores below the preferred threshold — expect favorable rates from most carriers."}
          {tier?.label === "Standard Risk" &&
            "This group sits in the mid-range — carriers will likely offer standard rates with room for negotiation."}
          {tier?.label === "High Risk" &&
            "This group exceeds standard thresholds — explore cost-sharing structures and loss-ratio-sensitive carriers."}
          {!tier?.label && "A risk tier will be assigned once the score is available."}
        </p>
      </Card>
    </div>
  );
}
