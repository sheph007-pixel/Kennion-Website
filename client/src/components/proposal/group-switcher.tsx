import { Building2 } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useMyGroups } from "@/hooks/use-proposal";
import { TIER_CONFIG, type RiskTier } from "@/pages/admin/constants";

// Sits in the top nav just right of the logo. Reads as a "you are
// here" indicator: tier dot + bold company name for the active group.
// Clicking it opens the full groups gallery (/dashboard/groups) where
// switching + creating new groups happens. Hidden on the gallery page
// itself (no active group) and on admin routes.
export function GroupSwitcher() {
  const [location, navigate] = useLocation();
  const [, params] = useRoute("/dashboard/:groupId");
  const activeId = params?.groupId;
  const { groups } = useMyGroups();

  if (location.startsWith("/admin")) return null;
  if (location.startsWith("/dashboard/groups")) return null;
  if (groups.length === 0) return null;

  const active = groups.find((g) => g.id === activeId) ?? groups[0];
  const activeTier = active?.riskTier as RiskTier | null | undefined;
  const activeTierConfig = activeTier && TIER_CONFIG[activeTier];

  return (
    <button
      type="button"
      onClick={() => navigate("/dashboard/groups")}
      className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm hover-elevate"
      data-testid="button-group-switcher"
      aria-label="View all groups"
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
      <span className="max-w-[200px] truncate font-bold">{active.companyName}</span>
    </button>
  );
}
