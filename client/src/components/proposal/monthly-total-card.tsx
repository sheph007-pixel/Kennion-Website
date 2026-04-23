import { money0, fmtMonthYear } from "@/lib/kennion-rates";
import { Card } from "@/components/ui/card";

type Props = {
  planName: string;
  effectiveDate: Date;
  gross: number;
  employerCost: number;
  employeeCost: number;
};

// Monthly Total: reads top-to-bottom as a build-up — employer + employee
// → total. Same light card surface as the Effective Date and Monthly
// Budget cards in the rail; a small filled dot next to the eyebrow is
// the only signal that this card is the *derived result* rather than an
// input. Typography (the big bold total) carries the emphasis so the
// plan grid on the right stays the page's focal point.
export function MonthlyTotalCard({
  planName,
  effectiveDate,
  gross,
  employerCost,
  employeeCost,
}: Props) {
  return (
    <Card className="p-5" data-testid="card-monthly-total">
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Monthly Total
        </div>
      </div>
      <div
        className="mt-1 truncate text-sm font-semibold"
        data-testid="text-selected-plan-name"
      >
        {planName}
      </div>
      <div className="mt-3 text-xs">
        <Row label="Paid by company" value={money0(employerCost)} testId="text-employer-cost" />
        <Row label="Paid by employees" value={money0(employeeCost)} testId="text-employee-cost" />
      </div>

      <div className="mt-3 border-t pt-3">
        <div className="flex items-baseline gap-1.5 font-sans">
          <div
            className="text-[30px] font-bold leading-none tracking-tight"
            data-testid="text-total-gross"
          >
            {money0(gross)}
          </div>
          <div className="text-sm text-muted-foreground">/mo</div>
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          Effective {fmtMonthYear(effectiveDate)}
        </div>
      </div>
    </Card>
  );
}

function Row({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums" data-testid={testId}>
        {value}
      </span>
    </div>
  );
}
