import { money0, fmtMonthYear } from "@/lib/kennion-rates";

type Props = {
  planName: string;
  effectiveDate: Date;
  gross: number;
  employerCost: number;
  employeeCost: number;
};

// Navy card that sits in the Cockpit rail. The design specifies the
// "Paid by company" / "Paid by employees" row labels (not "Employer" /
// "Employees"), with the selected plan name clearly above the total.
export function MonthlyTotalCard({
  planName,
  effectiveDate,
  gross,
  employerCost,
  employeeCost,
}: Props) {
  return (
    <div
      className="rounded-md p-5 text-white shadow-sm"
      style={{ background: "hsl(215 50% 18%)" }}
      data-testid="card-monthly-total"
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
        Monthly Total
      </div>
      <div
        className="mt-1 truncate text-sm font-semibold text-white"
        data-testid="text-selected-plan-name"
      >
        {planName}
      </div>
      <div className="mt-3 text-xs text-white/80">
        <Row label="Paid by company" value={money0(employerCost)} testId="text-employer-cost" />
        <Row label="Paid by employees" value={money0(employeeCost)} testId="text-employee-cost" />
      </div>

      <div className="mt-3 border-t border-white/15 pt-3">
        <div className="flex items-baseline gap-1.5 font-sans">
          <div
            className="text-[30px] font-bold leading-none tracking-tight"
            data-testid="text-total-gross"
          >
            {money0(gross)}
          </div>
          <div className="text-sm text-white/55">/mo</div>
        </div>
        <div className="mt-1 text-[11px] text-white/50">
          Effective {fmtMonthYear(effectiveDate)}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span>{label}</span>
      <span className="font-mono tabular-nums" data-testid={testId}>
        {value}
      </span>
    </div>
  );
}
