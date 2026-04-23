import { Printer, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DENTAL_PLANS, VISION_PLANS } from "@/lib/kennion-rates";
import { SUPPLEMENTAL_COVERAGE, HOSPITAL_PLAN_DETAILS } from "@shared/plan-benefits";
import { inferRatingArea } from "@shared/rating-area";
import type { Group } from "@shared/schema";
import type { MedicalPlan, TieredRates } from "@/lib/kennion-rates";

// Full-proposal export modal — styled like the site and designed to
// be printed or saved as PDF via the browser's native Print dialog.
// This replaces the server-rendered PDF download so the feature
// works even when the Railway deploy pipeline is broken.
//
// Hook target: <div data-print-target> on the dialog content. The
// `@media print` rules in index.css hide everything in the page
// except that subtree, so Print → Save as PDF captures a clean
// document with no nav / modal chrome / backdrop.

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: Group;
  effectiveDate: Date;
  plans: MedicalPlan[];
};

const money = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtLong = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export function ProposalExportModal({
  open,
  onOpenChange,
  group,
  effectiveDate,
  plans,
}: Props) {
  const ratingArea =
    group.state || group.zipCode
      ? inferRatingArea(group.state, group.zipCode)
      : null;

  function handlePrint() {
    // Native browser print — user picks "Save as PDF" to download, or
    // prints directly. CSS in index.css hides the rest of the page.
    window.print();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        data-print-target
      >
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>Full Proposal</span>
            <div className="flex items-center gap-2 pr-8">
              <Button
                size="sm"
                onClick={handlePrint}
                className="gap-1.5"
                data-testid="button-print-proposal"
              >
                <Printer className="h-4 w-4" />
                Print / Save PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="gap-1.5"
              >
                <X className="h-4 w-4" />
                Close
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Print-body: everything inside this block is what the user
            gets when they hit Print / Save PDF. Uses print-friendly
            typography and page-break rules. */}
        <div className="print-body space-y-6">
          {/* Group header */}
          <section>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              Kennion — Captive Health Solutions
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              Group Benefits Proposal
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Prepared for <strong className="text-foreground">{group.companyName}</strong>
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-muted-foreground">Effective Date</dt>
                <dd className="font-semibold">{fmtLong(effectiveDate)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Lives</dt>
                <dd className="font-semibold">{group.totalLives ?? 0}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Employees</dt>
                <dd className="font-semibold">{group.employeeCount ?? 0}</dd>
              </div>
              {ratingArea && (
                <div>
                  <dt className="text-xs text-muted-foreground">Rating Area</dt>
                  <dd className="font-semibold">{ratingArea}</dd>
                </div>
              )}
            </dl>
          </section>

          {plans.length > 0 && (
            <Section title="Medical Plans — Monthly Rates">
              <RateTable
                rows={plans.map((p) => ({ name: p.name, rates: p.base }))}
              />
            </Section>
          )}

          <Section title="Dental Plans — Monthly Rates">
            <RateTable
              rows={DENTAL_PLANS.map((p) => ({ name: p.name, rates: p.rates }))}
            />
          </Section>

          <Section title="Vision Plans — Monthly Rates">
            <RateTable
              rows={VISION_PLANS.map((p) => ({ name: p.name, rates: p.rates }))}
            />
          </Section>

          <Section title="Voluntary Benefits">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[hsl(215_50%_18%)] text-left text-white">
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]">Benefit</th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]">Coverage</th>
                </tr>
              </thead>
              <tbody>
                {SUPPLEMENTAL_COVERAGE.map((s) => (
                  <tr key={s.key} className="border-b last:border-b-0">
                    <td className="px-3 py-2 align-top text-sm font-semibold">{s.name}</td>
                    <td className="px-3 py-2 align-top text-sm">
                      <div>{s.coverage}</div>
                      {s.note && (
                        <div className="mt-0.5 text-xs italic text-muted-foreground">{s.note}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="Voluntary Hospital — Benefits">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[hsl(215_50%_18%)] text-white">
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em]">Plan</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-[0.12em]">Inpatient Admission</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-[0.12em]">ER / Urgent Care</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-[0.12em]">Surgery</th>
                </tr>
              </thead>
              <tbody>
                {HOSPITAL_PLAN_DETAILS.map((p, i) => (
                  <tr key={p.key} className={i % 2 === 0 ? "bg-muted/40" : ""}>
                    <td className="px-3 py-2 text-sm font-semibold">{p.name}</td>
                    <td className="px-3 py-2 text-right text-sm tabular-nums">{p.inpatientAdmission}</td>
                    <td className="px-3 py-2 text-right text-sm tabular-nums">{p.erUrgentCare}</td>
                    <td className="px-3 py-2 text-right text-sm tabular-nums">{p.surgery}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <p className="text-xs italic text-muted-foreground">
            Rates are illustrative and subject to final underwriting approval.
            Questions? Contact your Kennion advisor.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="print-section">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-primary">
        {title}
      </h2>
      <div className="overflow-hidden rounded-md border bg-card">
        {children}
      </div>
    </section>
  );
}

function RateTable({ rows }: { rows: Array<{ name: string; rates: TieredRates }> }) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-[hsl(215_50%_18%)] text-white">
          <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em]">Plan</th>
          <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-[0.12em]">EE Only</th>
          <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-[0.12em]">+ Children</th>
          <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-[0.12em]">+ Spouse</th>
          <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-[0.12em]">+ Family</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.name} className={i % 2 === 0 ? "bg-muted/40" : ""}>
            <td className="px-3 py-2 text-sm font-medium">{r.name}</td>
            <td className="px-3 py-2 text-right text-sm tabular-nums">{money(r.rates.EE)}</td>
            <td className="px-3 py-2 text-right text-sm tabular-nums">{money(r.rates.EE_CH)}</td>
            <td className="px-3 py-2 text-right text-sm tabular-nums">{money(r.rates.EE_SP)}</td>
            <td className="px-3 py-2 text-right text-sm tabular-nums">{money(r.rates.EE_FAM)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
