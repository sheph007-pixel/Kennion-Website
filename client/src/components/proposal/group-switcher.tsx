import { Check, ChevronDown, Plus, Building2 } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMyGroups } from "@/hooks/use-proposal";
import { TIER_CONFIG, type RiskTier } from "@/pages/admin/constants";
import { cn } from "@/lib/utils";
import type { Group } from "@shared/schema";

// Sits in the top nav just right of the logo. When the user has only
// one group it still renders — makes the UI feel consistent across
// employer (one group) and broker (many groups) accounts. The main
// value for brokers is flipping between quotes with one click.
export function GroupSwitcher() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/dashboard/:groupId");
  const activeId = params?.groupId;
  const { groups } = useMyGroups();

  if (groups.length === 0) return null;

  const active = groups.find((g) => g.id === activeId) ?? groups[0];
  const activeTier = active?.riskTier as RiskTier | null | undefined;
  const activeTierConfig = activeTier && TIER_CONFIG[activeTier];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm font-medium hover-elevate"
          data-testid="button-group-switcher"
        >
          {activeTierConfig ? (
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: activeTierConfig.hsl }}
              aria-hidden
            />
          ) : (
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          )}
          <span className="max-w-[180px] truncate">{active.companyName}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {groups.length === 1 ? "Your group" : `Your groups (${groups.length})`}
        </DropdownMenuLabel>
        {groups.map((g) => (
          <GroupRow
            key={g.id}
            group={g}
            active={g.id === active.id}
            onSelect={() => navigate(`/dashboard/${g.id}`)}
          />
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate("/dashboard/new")} data-testid="menu-new-group">
          <Plus className="mr-2 h-4 w-4 text-primary" />
          <span className="font-semibold text-primary">New Group</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GroupRow({
  group,
  active,
  onSelect,
}: {
  group: Group;
  active: boolean;
  onSelect: () => void;
}) {
  const tier = group.riskTier as RiskTier | null;
  const tierConfig = tier && TIER_CONFIG[tier];
  const submitted = group.submittedAt ? new Date(group.submittedAt) : null;
  const submittedLabel = submitted
    ? submitted.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;
  return (
    <DropdownMenuItem
      onSelect={onSelect}
      className="flex items-start gap-2 py-2"
      data-testid={`menu-group-${group.id}`}
    >
      <span
        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
        style={{ background: tierConfig?.hsl ?? "hsl(var(--muted-foreground))" }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className={cn("truncate text-sm font-semibold", active && "text-primary")}>
            {group.companyName}
          </div>
          {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          {tierConfig ? <span>{tierConfig.label}</span> : <span>Pending analysis</span>}
          {submittedLabel && (
            <>
              <span aria-hidden>·</span>
              <span>{submittedLabel}</span>
            </>
          )}
          <span aria-hidden>·</span>
          <span>{group.totalLives ?? 0} lives</span>
        </div>
      </div>
    </DropdownMenuItem>
  );
}
