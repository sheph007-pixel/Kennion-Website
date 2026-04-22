import { ChevronDown, Building2 } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useMyGroups } from "@/hooks/use-proposal";
import { TIER_CONFIG, type RiskTier } from "@/pages/admin/constants";

// Sits in the top nav just right of the logo. Shows the active group
// (tier dot + company name) and navigates to /dashboard/groups on click
// — the full groups gallery handles switching and creating new groups.
// This was a dropdown before; we moved to a page because the dropdown
// doesn't scale for brokers with many clients.
export function GroupSwitcher() {
  const [location, navigate] = useLocation();
  const [, params] = useRoute("/dashboard/:groupId");
  const activeId = params?.groupId;
  const { groups } = useMyGroups();

  // Hide entirely on admin routes — the admin cockpit is "viewing as
  // customer", switching between the admin's OWN groups there would be
  // confusing. Admin navigates groups via /admin.
  if (location.startsWith("/admin")) return null;
  if (groups.length === 0) return null;

  const active = groups.find((g) => g.id === activeId) ?? groups[0];
  const activeTier = active?.riskTier as RiskTier | null | undefined;
  const activeTierConfig = activeTier && TIER_CONFIG[activeTier];

  return (
    <button
      type="button"
      onClick={() => navigate("/dashboard/groups")}
      className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm font-medium hover-elevate"
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
      <span className="max-w-[180px] truncate">{active.companyName}</span>
      <ChevronDown className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
