import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Track scroll position + container width so the edge fades and the
  // chevron buttons only show when there's actually more content in
  // that direction. Same pattern Stripe / Notion / Linear use on wide
  // comparison tables.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setCanScrollLeft(scrollLeft > 4);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [plans.length]);

  function scrollByColumn(direction: 1 | -1) {
    const el = scrollRef.current;
    if (!el) return;
    // Scroll by roughly one plan column so each click advances the
    // comparison by one plan — feels more deliberate than a free swipe.
    const step = Math.max(minPlanColWidth + 8, 160);
    el.scrollBy({ left: step * direction, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="w-full overflow-x-auto rounded-md border bg-card"
      >
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

      {/* Edge fades + scroll affordances. The fades signal that the
          table continues past the viewport; the chevron buttons give
          keyboard/pointer users an explicit way to advance one plan at
          a time. Both hide themselves once the user reaches that edge. */}
      {canScrollLeft && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-12 rounded-l-md bg-gradient-to-r from-background to-transparent"
          />
          <button
            type="button"
            onClick={() => scrollByColumn(-1)}
            aria-label="Scroll left"
            className="absolute left-2 top-1/2 z-40 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border bg-card text-foreground shadow-md hover-elevate"
            data-testid="button-grid-scroll-left"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </>
      )}
      {canScrollRight && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-12 rounded-r-md bg-gradient-to-l from-background to-transparent"
          />
          <button
            type="button"
            onClick={() => scrollByColumn(1)}
            aria-label="Scroll right"
            className="absolute right-2 top-1/2 z-40 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border bg-card text-foreground shadow-md hover-elevate"
            data-testid="button-grid-scroll-right"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  );
}
