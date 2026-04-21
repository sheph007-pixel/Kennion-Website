import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import {
  FileText,
  Download,
  Loader2,
  ArrowLeft,
  Shield,
  LogOut,
  User,
} from "lucide-react";
import { KennionLogo } from "@/components/kennion-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Group, Proposal } from "@shared/schema";

function ProposalsNav() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="cursor-pointer" onClick={() => navigate("/dashboard")}>
            <KennionLogo size="md" />
          </div>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="hidden sm:flex items-center gap-4 text-sm">
            <button
              onClick={() => navigate("/dashboard")}
              className="text-muted-foreground hover:text-foreground"
              data-testid="nav-dashboard"
            >
              Dashboard
            </button>
            <span className="font-medium text-foreground">Proposals</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-md bg-muted/50">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-sm font-medium text-foreground">{user?.fullName}</span>
              <span className="text-xs text-muted-foreground">{user?.email}</span>
            </div>
          </div>
          <ThemeToggle />
          <Button
            variant="outline"
            onClick={handleLogout}
            className="gap-2"
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </nav>
  );
}

type ProposalRow = {
  groupId: string;
  companyName: string;
  groupStatus: string;
  proposal: Proposal;
};

export default function ProposalsPage() {
  const [, navigate] = useLocation();

  // 1. Load this user's groups.
  const groupsQ = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

  const groups = groupsQ.data ?? [];

  // 2. For every group, load its proposals. (Usually 1-2 per group.)
  // Using one query per group is fine at this scale — the dashboard already
  // fetches /api/groups, and proposals/count per group is small.
  const proposalsQueries = useQuery<ProposalRow[]>({
    queryKey: ["/api/groups/all-proposals", groups.map((g) => g.id).join(",")],
    enabled: groups.length > 0,
    queryFn: async () => {
      const all: ProposalRow[] = [];
      for (const g of groups) {
        try {
          const res = await fetch(`/api/groups/${g.id}/proposals`, {
            credentials: "include",
          });
          if (!res.ok) continue;
          const items = (await res.json()) as Proposal[];
          for (const p of items || []) {
            all.push({
              groupId: g.id,
              companyName: g.companyName,
              groupStatus: g.status,
              proposal: p,
            });
          }
        } catch {
          /* ignore single-group errors, keep aggregating */
        }
      }
      // Newest first.
      all.sort((a, b) => {
        const at = new Date(a.proposal.createdAt ?? 0).getTime();
        const bt = new Date(b.proposal.createdAt ?? 0).getTime();
        return bt - at;
      });
      return all;
    },
  });

  const rows = proposalsQueries.data ?? [];

  const pendingGroups = useMemo(
    () =>
      groups.filter(
        (g) =>
          g.status === "census_uploaded" || g.status === "approved",
      ),
    [groups],
  );

  const loading = groupsQ.isLoading || proposalsQueries.isLoading;

  return (
    <div className="min-h-screen bg-background">
      <ProposalsNav />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <button
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-1 hover:text-foreground"
                data-testid="link-back-dashboard"
              >
                <ArrowLeft className="h-3 w-3" /> Back to Dashboard
              </button>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Proposals</h1>
            <p className="text-muted-foreground">
              Your Kennion medical proposal documents.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading your proposals…
          </div>
        ) : rows.length === 0 ? (
          <Card className="border-dashed p-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold">No proposals yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Your proposal will appear here once Kennion has reviewed and
              approved your census and generated your group's pricing.
            </p>
            {pendingGroups.length > 0 && (
              <div className="mt-6 inline-flex items-center gap-2 rounded-md border border-card-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                {pendingGroups.length === 1
                  ? `1 group is under review.`
                  : `${pendingGroups.length} groups are under review.`}
              </div>
            )}
            <div className="mt-6">
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard")}
                data-testid="button-back-to-dashboard"
              >
                Back to Dashboard
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <Card
                key={r.proposal.id}
                className="flex flex-col gap-4 border-card-border p-5 sm:flex-row sm:items-center sm:justify-between"
                data-testid={`proposal-row-${r.proposal.id}`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold">{r.companyName}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {r.groupStatus === "proposal_accepted"
                          ? "Accepted"
                          : r.groupStatus === "client"
                          ? "Active Client"
                          : "Proposal Sent"}
                      </Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {r.proposal.fileName}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Generated{" "}
                      {r.proposal.createdAt
                        ? format(new Date(r.proposal.createdAt), "MMM d, yyyy 'at' h:mm a")
                        : "—"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() =>
                      window.open(`/api/proposals/${r.proposal.id}/pdf`, "_blank")
                    }
                    data-testid={`button-view-${r.proposal.id}`}
                  >
                    <FileText className="h-3.5 w-3.5" /> View PDF
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      const a = document.createElement("a");
                      a.href = `/api/proposals/${r.proposal.id}/pdf`;
                      a.download = r.proposal.fileName || "proposal.pdf";
                      a.click();
                    }}
                    data-testid={`button-download-${r.proposal.id}`}
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
