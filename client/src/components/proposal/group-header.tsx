import { FileText } from "lucide-react";
import { TierBadge } from "./tier-badge";
import type { RiskTier } from "@/pages/admin/constants";

type Props = {
  companyName: string;
  tier: RiskTier | null | undefined;
  employees: number;
  coveredLives: number;
  medianAge: number | null;
  censusFileName?: string | null;
  onViewCensus?: () => void;
};

export function GroupHeader({
  companyName,
  tier,
  employees,
  coveredLives,
  medianAge,
  censusFileName,
  onViewCensus,
}: Props) {
  return (
    <div className="mb-6" data-testid="proposal-group-header">
      <TierBadge tier={tier} className="mb-3" />
      <h1
        className="text-[34px] leading-tight font-bold tracking-tight text-foreground"
        data-testid="text-group-title"
      >
        {companyName}
      </h1>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span data-testid="text-employees">{employees} employees</span>
        <span aria-hidden>·</span>
        <span data-testid="text-lives">{coveredLives} covered lives</span>
        {medianAge != null && (
          <>
            <span aria-hidden>·</span>
            <span data-testid="text-median-age">Median age {medianAge}</span>
          </>
        )}
        {onViewCensus && (
          <>
            <span aria-hidden>·</span>
            <button
              type="button"
              onClick={onViewCensus}
              className="inline-flex items-center gap-1.5 text-primary font-medium hover:underline"
              data-testid="button-view-census"
            >
              <FileText className="h-3.5 w-3.5" />
              View census {censusFileName ? `(${censusFileName})` : ""}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
