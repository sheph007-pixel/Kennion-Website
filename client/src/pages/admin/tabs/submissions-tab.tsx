import { useMemo } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import type { Group } from "@shared/schema";
import { useGroups } from "../hooks";
import { StatusBadge } from "../components/status-badge";
import { tierConfig } from "../constants";

function censusId(id: string): string {
  return `KBA-${id.substring(0, 8).toUpperCase()}`;
}

export function SubmissionsTab({ group }: { group: Group }) {
  const { data: groups } = useGroups();

  const companySubmissions = useMemo(() => {
    if (!groups) return [group];
    return groups
      .filter((g) => g.companyName === group.companyName)
      .sort(
        (a, b) =>
          new Date(b.submittedAt).getTime() -
          new Date(a.submittedAt).getTime(),
      );
  }, [groups, group]);

  return (
    <Card className="overflow-hidden border-card-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/30">
          <tr className="border-b border-card-border text-muted-foreground">
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide">Submitted</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide">Census ID</th>
            <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-wide">Lives</th>
            <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-wide">Risk</th>
            <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-wide">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {companySubmissions.map((g) => {
            const isCurrent = g.id === group.id;
            const tier = tierConfig(g.riskTier);
            return (
              <tr
                key={g.id}
                className={cn(
                  "border-b border-card-border last:border-0",
                  isCurrent && "bg-primary/5",
                )}
              >
                <td className="px-4 py-3">
                  <div>{format(new Date(g.submittedAt), "MMM d, yyyy")}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {format(new Date(g.submittedAt), "h:mm a")}
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                  {censusId(g.id)}
                  {isCurrent && (
                    <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      Current
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">{g.totalLives ?? 0}</td>
                <td className="px-4 py-3 text-center">
                  <span className={cn("font-medium", tier?.className)}>
                    {g.riskScore != null ? g.riskScore.toFixed(2) : "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center">
                    <StatusBadge status={g.status} />
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  {!isCurrent && (
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/groups/${g.id}`}>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
