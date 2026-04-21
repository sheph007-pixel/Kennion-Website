import { Card } from "@/components/ui/card";
import type { Group } from "@shared/schema";

type Row = { metric: string; value: string; notes: string };

function rows(group: Group): Row[] {
  const fmt = (n: number | null | undefined) => (n == null ? "—" : String(n));
  const fmtFloat = (n: number | null | undefined) =>
    n == null ? "—" : n.toFixed(1);
  const total = group.totalLives ?? 0;
  const ee = group.employeeCount ?? 0;
  return [
    { metric: "Total Lives", value: fmt(total), notes: "Sum of employees + dependents" },
    { metric: "Employees", value: fmt(ee), notes: "Primary insured members" },
    { metric: "Spouses", value: fmt(group.spouseCount), notes: "Dependent spouses on plan" },
    { metric: "Children", value: fmt(group.childrenCount), notes: "Dependent children on plan" },
    { metric: "Average Age", value: fmtFloat(group.averageAge), notes: "Mean age across all enrolled lives" },
    { metric: "Male", value: fmt(group.maleCount), notes: "" },
    { metric: "Female", value: fmt(group.femaleCount), notes: "" },
    {
      metric: "Employees / Total",
      value: total ? `${((ee / total) * 100).toFixed(0)}%` : "—",
      notes: "Employee ratio",
    },
  ];
}

export function CensusDataTab({ group }: { group: Group }) {
  const data = rows(group);
  return (
    <Card className="overflow-hidden border-card-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/30">
          <tr className="border-b border-card-border text-muted-foreground">
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide">Metric</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide">Value</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide">Notes</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.metric} className="border-b border-card-border last:border-0">
              <td className="px-4 py-3 font-medium">{r.metric}</td>
              <td className="px-4 py-3 font-mono text-sm">{r.value}</td>
              <td className="px-4 py-3 text-muted-foreground">{r.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
