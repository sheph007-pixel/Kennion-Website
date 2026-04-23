import { cn } from "@/lib/utils";

// Visual row specifier for the grid.
//   - "data" rows render a benefit name on the left and one cell per
//     plan on the right.
//   - "section" rows render a full-width dark band (e.g. the "Benefits"
//     / "Covered Services" bars from the PDFs) to visually separate
//     check-style rows from dollar-copay rows.
export type BenefitRow<P> =
  | {
      kind: "data";
      label: string;
      render: (plan: P) => string;
    }
  | {
      kind: "section";
      label: string;
    };

type Props<P extends { key: string; name: string }> = {
  plans: P[];
  rows: BenefitRow<P>[];
  selectedKey?: string | null;
  // Column width for the benefit-name column. Plans themselves share the
  // remaining width evenly.
  labelColWidth?: number;
  // Optional minimum pixel width for each plan column — keeps copy from
  // cramping when there are a lot of plans. Drives horizontal scroll.
  minPlanColWidth?: number;
};

// Re-used color cues so tables read consistently across tabs — matches
// the carrier-style PDFs the content was transcribed from.
function cellClassFor(value: string): string {
  const v = value.trim();
  if (v === "Free On App") return "text-primary font-semibold";
  if (v === "No Charge") return "text-emerald-700 font-semibold dark:text-emerald-400";
  if (v === "✓") return "text-emerald-700 font-bold dark:text-emerald-400";
  if (v === "—") return "text-muted-foreground";
  return "";
}

export function BenefitGrid<P extends { key: string; name: string }>({
  plans,
  rows,
  selectedKey,
  labelColWidth = 220,
  minPlanColWidth = 140,
}: Props<P>) {
  const selectedIdx = selectedKey
    ? plans.findIndex((p) => p.key === selectedKey)
    : -1;

  return (
    <div className="relative w-full overflow-auto rounded-md border bg-card">
      <table className="w-full border-collapse text-sm">
        <colgroup>
          <col style={{ width: labelColWidth, minWidth: labelColWidth }} />
          {plans.map((p) => (
            <col key={p.key} style={{ minWidth: minPlanColWidth }} />
          ))}
        </colgroup>

        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 top-0 z-30 h-14 border-b border-r bg-[hsl(215_50%_18%)] px-4 text-left align-middle text-[11px] font-semibold uppercase tracking-[0.12em] text-white/80"
            >
              Benefit
            </th>
            {plans.map((p, i) => (
              <th
                key={p.key}
                scope="col"
                className={cn(
                  "sticky top-0 z-20 h-14 border-b border-white/10 bg-[hsl(215_50%_18%)] px-3 text-center align-middle text-xs font-semibold leading-tight text-white",
                  i === selectedIdx && "ring-2 ring-inset ring-amber-400",
                )}
              >
                {p.name}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, rIdx) => {
            if (row.kind === "section") {
              return (
                <tr key={`sec-${rIdx}`}>
                  <td
                    colSpan={plans.length + 1}
                    className="sticky left-0 z-10 h-8 bg-foreground px-4 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-background"
                  >
                    {row.label}
                  </td>
                </tr>
              );
            }
            return (
              <tr key={`row-${rIdx}`} className="border-b last:border-b-0">
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-r bg-card px-4 py-2 text-left text-sm font-medium text-foreground"
                >
                  {row.label}
                </th>
                {plans.map((p, i) => {
                  const value = row.render(p);
                  return (
                    <td
                      key={p.key}
                      className={cn(
                        "px-3 py-2 text-center align-middle text-sm tabular-nums",
                        cellClassFor(value),
                        i === selectedIdx && "bg-primary/5 ring-1 ring-inset ring-primary/20",
                      )}
                    >
                      {value}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
