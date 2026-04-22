import { useState } from "react";
import { FileText, Lock, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TierBadge } from "./tier-badge";
import { ScoreAuditDialog } from "./score-audit-dialog";
import { cn } from "@/lib/utils";
import { TIER_CONFIG, type RiskTier } from "@/pages/admin/constants";
import { inferRatingArea } from "@shared/rating-area";
import type { Group, CensusEntry } from "@shared/schema";

type Props = {
  group: Group;
  census?: CensusEntry[];
  onViewCensus?: () => void;
};

export function GroupHeader({ group, census, onViewCensus }: Props) {
  const [auditOpen, setAuditOpen] = useState(false);

  const shortId = `KBA-${group.id.slice(0, 8).toUpperCase()}`;
  const submitted = group.submittedAt ? new Date(group.submittedAt) : null;
  const submittedLabel = submitted
    ? submitted.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const tier = group.riskTier as RiskTier | null;
  const tierConfig = tier && TIER_CONFIG[tier];

  // State + ZIP together drive the rating area, which is the actuarial
  // cost center for this group. Showing all three together makes the
  // pricing context obvious at a glance.
  const stateZip =
    group.state && group.zipCode
      ? `${group.state} ${group.zipCode}`
      : group.state || group.zipCode || null;
  const ratingArea =
    group.state || group.zipCode
      ? inferRatingArea(group.state, group.zipCode)
      : null;

  return (
    <Card className="mb-6 p-6" data-testid="proposal-group-header">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <TierBadge tier={tier} />
        {group.riskScore != null && tierConfig && (
          <button
            type="button"
            onClick={() => setAuditOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-0.5 text-[11px] font-semibold tabular-nums transition hover-elevate"
            title="View how this score was calculated"
            data-testid="badge-risk-score"
          >
            <Sparkles className="h-3 w-3" style={{ color: tierConfig.hsl }} />
            <span className="text-muted-foreground">Kennion Score</span>
            <span style={{ color: tierConfig.hsl }}>{group.riskScore.toFixed(2)}</span>
          </button>
        )}
        {group.locked && (
          <span
            className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400"
            title="Locked by your Kennion advisor"
            data-testid="badge-locked"
          >
            <Lock className="h-3 w-3" />
            Locked
          </span>
        )}
      </div>
      <h1
        className="text-[34px] font-bold leading-tight tracking-tight text-foreground"
        data-testid="text-group-title"
      >
        {group.companyName}
      </h1>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span
            className="font-mono font-semibold tracking-wide text-foreground"
            data-testid="text-census-id"
          >
            Census {shortId}
          </span>
          {submittedLabel && (
            <>
              <span aria-hidden>·</span>
              <span data-testid="text-submitted-at">Submitted {submittedLabel}</span>
            </>
          )}
          {stateZip && (
            <>
              <span aria-hidden>·</span>
              <span data-testid="text-state-zip">{stateZip}</span>
            </>
          )}
          {ratingArea && (
            <span
              className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-foreground"
              title="Rating area used to price this group"
              data-testid="chip-rating-area"
            >
              <MapPin className="h-3 w-3 text-muted-foreground" aria-hidden />
              {ratingArea}
            </span>
          )}
        </div>
        {onViewCensus && (
          <Button
            variant="outline"
            size="sm"
            onClick={onViewCensus}
            className="gap-1.5"
            data-testid="button-view-census"
          >
            <FileText className="h-3.5 w-3.5" />
            View Census
          </Button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Employees" value={group.employeeCount ?? 0} testId="stat-employees" />
        <Stat label="Spouses" value={group.spouseCount ?? 0} testId="stat-spouses" />
        <Stat label="Children" value={group.childrenCount ?? 0} testId="stat-children" />
        <Stat label="Total Lives" value={group.totalLives ?? 0} emphasis testId="stat-total-lives" />
      </div>

      <ScoreAuditDialog
        open={auditOpen}
        onOpenChange={setAuditOpen}
        group={group}
        census={census}
      />
    </Card>
  );
}

function Stat({
  label,
  value,
  emphasis,
  testId,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
  testId?: string;
}) {
  return (
    <Card className={cn("p-3", emphasis && "border-primary/40 bg-primary/5")} data-testid={testId}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-xl font-bold tabular-nums">{value ?? 0}</div>
    </Card>
  );
}
