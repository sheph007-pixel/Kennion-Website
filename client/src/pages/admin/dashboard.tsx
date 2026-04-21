import { useMemo } from "react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import {
  Activity as ActivityIcon,
  Building2,
  FileBarChart,
  Plus,
  TrendingUp,
  Users as UsersIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import type { Group } from "@shared/schema";
import { AdminLayout } from "./layout";
import { useGroups } from "./hooks";
import { StatusBadge } from "./components/status-badge";

function StatCard({
  label,
  value,
  icon: Icon,
  valueClassName,
  footer,
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  valueClassName?: string;
  footer?: string;
}) {
  return (
    <Card className="border-card-border p-5">
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <div
        className={cn(
          "mt-3 text-[22px] font-bold leading-none tracking-tight",
          valueClassName,
        )}
      >
        {value}
      </div>
      {footer && (
        <div className="mt-2 text-[11px] text-muted-foreground">{footer}</div>
      )}
    </Card>
  );
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { data: groups, isLoading } = useGroups();
  const [, navigate] = useLocation();

  const stats = useMemo(() => {
    const g = groups ?? [];
    return {
      activeSubmissions: g.filter((x) => x.status === "census_uploaded").length,
      totalLives: g.reduce((n, x) => n + (x.totalLives ?? 0), 0),
      proposalsSent: g.filter((x) => x.status === "proposal_sent").length,
      activeClients: g.filter((x) => x.status === "client").length,
    };
  }, [groups]);

  const recent = useMemo<Group[]>(() => {
    return (groups ?? [])
      .slice()
      .sort(
        (a, b) =>
          new Date(b.submittedAt).getTime() -
          new Date(a.submittedAt).getTime(),
      )
      .slice(0, 5);
  }, [groups]);

  const firstName = user?.fullName?.split(/\s+/)[0] ?? "there";

  return (
    <AdminLayout
      crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Dashboard" }]}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em]" data-testid="text-welcome">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's how the book is trending this week.
          </p>
        </div>
        <Button className="gap-2" onClick={() => navigate("/admin/groups")} data-testid="button-view-groups">
          <Plus className="h-4 w-4" />
          View Groups
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Active Submissions"
            value={stats.activeSubmissions}
            icon={ActivityIcon}
            footer="Awaiting proposal"
          />
          <StatCard
            label="Total Lives"
            value={stats.totalLives.toLocaleString()}
            icon={UsersIcon}
            footer="Across all groups"
          />
          <StatCard
            label="Proposals Sent"
            value={stats.proposalsSent}
            icon={FileBarChart}
            footer="Pending client response"
          />
          <StatCard
            label="Active Clients"
            value={stats.activeClients}
            icon={TrendingUp}
            valueClassName="text-green-700 dark:text-green-400"
            footer="Converted and in-force"
          />
        </div>
      )}

      <Card className="mt-6 overflow-hidden border-card-border">
        <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
          <div>
            <h2 className="font-semibold tracking-tight">Recent Submissions</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Latest 5 censuses across all companies.
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/groups">View all</Link>
          </Button>
        </div>
        {isLoading ? (
          <div className="space-y-2 p-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="p-10 text-center">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 font-semibold">No submissions yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Census submissions from clients will show up here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="border-b border-card-border text-muted-foreground">
                  <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide">Company</th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide">Contact</th>
                  <th className="px-5 py-3 text-center text-[11px] font-medium uppercase tracking-wide">Lives</th>
                  <th className="px-5 py-3 text-center text-[11px] font-medium uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((g) => (
                  <tr
                    key={g.id}
                    className="cursor-pointer border-b border-card-border last:border-0 transition-colors hover:bg-muted/30"
                    onClick={() => navigate(`/admin/groups/${g.id}`)}
                    data-testid={`row-recent-${g.id}`}
                  >
                    <td className="px-5 py-3 font-medium">{g.companyName}</td>
                    <td className="px-5 py-3 text-muted-foreground">{g.contactName}</td>
                    <td className="px-5 py-3 text-center">{g.totalLives ?? 0}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-center">
                        <StatusBadge status={g.status} />
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {format(new Date(g.submittedAt), "MMM d, yyyy")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AdminLayout>
  );
}
