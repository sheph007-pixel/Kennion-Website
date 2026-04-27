import { useMemo, useState } from "react";
import { format } from "date-fns";
import { useLocation } from "wouter";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  Briefcase,
  Copy,
  ExternalLink,
  Eye,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Slash,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ProposalNav } from "@/components/proposal/proposal-nav";
import { TIER_CONFIG, type RiskTier } from "@/pages/admin/constants";
import {
  useAdminQuotes,
  useRotateQuoteLink,
  useRevokeQuoteLink,
  useDeleteQuote,
  deriveQuoteStatus,
  statusLabel,
  type QuoteStatus,
} from "@/hooks/use-admin-quotes";
import type { Group } from "@shared/schema";
import { cn } from "@/lib/utils";

// Internal sales quotes list — sortable table. Click any column
// header to toggle sort direction. Default is newest submitted first
// so freshly minted quotes always sit at the top.
type SortKey =
  | "companyName"
  | "employeeCount"
  | "submittedAt"
  | "riskScore"
  | "riskTier";
type SortDir = "asc" | "desc";

// Lower index = "better" tier so ascending sort shows preferred
// risk → standard → high.  Anything else (null / unknown) sinks to
// the bottom of either direction.
const TIER_ORDER: Record<string, number> = {
  preferred: 0,
  standard: 1,
  high: 2,
};

function defaultDir(key: SortKey): SortDir {
  return key === "companyName" || key === "riskTier" ? "asc" : "desc";
}

export default function AdminQuotesPage() {
  const [, navigate] = useLocation();
  const { data: quotes, isLoading } = useAdminQuotes();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "submittedAt",
    dir: "desc",
  });

  function onSort(key: SortKey) {
    setSort((cur) =>
      cur.key === key
        ? { key, dir: cur.dir === "asc" ? "desc" : "asc" }
        : { key, dir: defaultDir(key) },
    );
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = quotes ?? [];
    const filtered = q
      ? all.filter((g) =>
          g.companyName?.toLowerCase().includes(q) ||
          g.contactName?.toLowerCase().includes(q) ||
          g.contactEmail?.toLowerCase().includes(q),
        )
      : all;
    const sorted = [...filtered].sort((a, b) => compareQuotes(a, b, sort.key, sort.dir));
    return sorted;
  }, [quotes, search, sort]);

  return (
    <div className="min-h-screen bg-background">
      <ProposalNav />
      <div className="mx-auto max-w-[1280px] px-6 py-8">
        <button
          type="button"
          onClick={() => navigate("/admin")}
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover-elevate rounded-md px-1.5 py-0.5"
          data-testid="button-back-to-admin"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to admin
        </button>

        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              <Briefcase className="h-3.5 w-3.5" />
              Sales quotes
            </div>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Internal Sales Quotes</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Mint a proposal on behalf of a prospect, then send the public link.
              Same engine, same scoring, same accept flow as customer-driven quotes.
            </p>
          </div>
          <Button
            onClick={() => navigate("/admin/quotes/new")}
            className="gap-1.5"
            data-testid="button-new-quote"
          >
            <Plus className="h-4 w-4" />
            New quote
          </Button>
        </div>

        <div className="mb-5">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by company, contact, or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-quote-search"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">
            {search ? (
              "No quotes match your search."
            ) : (
              <>
                No sales quotes yet.{" "}
                <button
                  type="button"
                  className="font-semibold text-primary hover:underline"
                  onClick={() => navigate("/admin/quotes/new")}
                >
                  Create the first one →
                </button>
              </>
            )}
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[260px]">
                    <SortBtn label="Company" k="companyName" sort={sort} onSort={onSort} />
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">
                    <SortBtn label="Employees" k="employeeCount" sort={sort} onSort={onSort} align="right" />
                  </TableHead>
                  <TableHead>
                    <SortBtn label="Submitted" k="submittedAt" sort={sort} onSort={onSort} />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortBtn label="Score" k="riskScore" sort={sort} onSort={onSort} align="right" />
                  </TableHead>
                  <TableHead>
                    <SortBtn label="Tier" k="riskTier" sort={sort} onSort={onSort} />
                  </TableHead>
                  <TableHead className="w-[180px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((g) => (
                  <QuoteRow key={g.id} group={g} />
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}

function SortBtn({
  label,
  k,
  sort,
  onSort,
  align = "left",
}: {
  label: string;
  k: SortKey;
  sort: { key: SortKey; dir: SortDir };
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = sort.key === k;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => onSort(k)}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide hover:text-foreground",
        active ? "text-foreground" : "text-muted-foreground",
        align === "right" && "ml-auto",
      )}
      data-testid={`sort-${k}`}
    >
      {label}
      <Icon className={cn("h-3 w-3", !active && "opacity-50")} />
    </button>
  );
}

function compareQuotes(a: Group, b: Group, key: SortKey, dir: SortDir): number {
  const factor = dir === "asc" ? 1 : -1;
  switch (key) {
    case "companyName": {
      return (a.companyName ?? "").localeCompare(b.companyName ?? "") * factor;
    }
    case "employeeCount": {
      return ((a.employeeCount ?? 0) - (b.employeeCount ?? 0)) * factor;
    }
    case "submittedAt": {
      const av = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const bv = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return (av - bv) * factor;
    }
    case "riskScore": {
      // Drafts (no score) sink to the bottom regardless of direction.
      const av = a.riskScore;
      const bv = b.riskScore;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return (av - bv) * factor;
    }
    case "riskTier": {
      const av = a.riskTier ? TIER_ORDER[a.riskTier] ?? 99 : 99;
      const bv = b.riskTier ? TIER_ORDER[b.riskTier] ?? 99 : 99;
      return (av - bv) * factor;
    }
  }
}

function QuoteRow({ group }: { group: Group }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const rotate = useRotateQuoteLink();
  const revoke = useRevokeQuoteLink();
  const del = useDeleteQuote();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const status = deriveQuoteStatus(group);
  const tier = group.riskTier as RiskTier | null | undefined;
  const tierConfig = tier && TIER_CONFIG[tier];
  const publicUrl = group.publicToken
    ? `${window.location.origin}/q/${group.publicToken}`
    : null;
  const submittedLabel = group.submittedAt
    ? format(new Date(group.submittedAt), "MMM d, yyyy")
    : "—";
  const lastViewedLabel = group.lastViewedAt
    ? format(new Date(group.lastViewedAt), "MMM d · h:mm a")
    : null;

  function copyLink() {
    if (!publicUrl) return;
    navigator.clipboard
      .writeText(publicUrl)
      .then(() => toast({ title: "Link copied" }))
      .catch(() => toast({ title: "Copy failed", variant: "destructive" }));
  }

  // Whole-row click opens the cockpit; per-cell controls
  // (mailto link, action buttons) stop propagation so their own
  // handlers fire without yanking the rep into the cockpit.
  function openCockpit() {
    navigate(`/admin/groups/${group.id}`);
  }

  return (
    <>
      <TableRow
        className="cursor-pointer"
        onClick={openCockpit}
        data-testid={`row-quote-${group.id}`}
      >
        <TableCell>
          <div className="flex items-start gap-2.5">
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
              style={{ background: tierConfig?.hsl ?? "hsl(var(--muted-foreground))" }}
              aria-hidden
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{group.companyName}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                {group.contactName ? (
                  <span>{group.contactName}</span>
                ) : !group.contactEmail ? (
                  <span className="italic">No contact yet</span>
                ) : null}
                {group.contactEmail && (
                  <>
                    {group.contactName && <span aria-hidden>·</span>}
                    <a
                      href={`mailto:${group.contactEmail}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:text-foreground"
                    >
                      {group.contactEmail}
                    </a>
                  </>
                )}
                {lastViewedLabel && (
                  <>
                    <span aria-hidden>·</span>
                    <span>
                      {group.viewCount ?? 0}{" "}
                      {(group.viewCount ?? 0) === 1 ? "view" : "views"} · last{" "}
                      {lastViewedLabel}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </TableCell>

        <TableCell>
          <StatusPill status={status} />
        </TableCell>

        <TableCell className="text-right tabular-nums">
          {group.employeeCount ?? 0}
        </TableCell>

        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
          {submittedLabel}
        </TableCell>

        <TableCell className="text-right tabular-nums">
          {group.riskScore != null ? (
            <span style={{ color: tierConfig?.hsl }}>{group.riskScore.toFixed(2)}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>

        <TableCell>
          {tierConfig ? (
            <span className={cn("text-[11px] font-semibold uppercase tracking-wide", tierConfig.className)}>
              {tier === "high" ? "Not Approved" : tierConfig.label}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </TableCell>

        <TableCell className="text-right">
          <div
            className="flex items-center justify-end gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {publicUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={copyLink}
                className="gap-1.5"
                data-testid={`button-copy-link-${group.id}`}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy link
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  data-testid={`button-quote-menu-${group.id}`}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={openCockpit}>
                  <Eye className="mr-2 h-4 w-4" />
                  Open in cockpit
                </DropdownMenuItem>
                {publicUrl && (
                  <DropdownMenuItem onSelect={() => window.open(publicUrl, "_blank")}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Preview public page
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() =>
                    rotate.mutate(group.id, {
                      onSuccess: () => toast({ title: "Link rotated", description: "The old link no longer works." }),
                      onError: (e: any) => toast({ title: "Rotate failed", description: e?.message, variant: "destructive" }),
                    })
                  }
                  disabled={!group.riskTier}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Rotate link
                </DropdownMenuItem>
                {group.publicToken && (
                  <DropdownMenuItem onSelect={() => setConfirmRevoke(true)}>
                    <Slash className="mr-2 h-4 w-4" />
                    Revoke link
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => setConfirmDelete(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete quote
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TableCell>
      </TableRow>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this quote?</AlertDialogTitle>
            <AlertDialogDescription>
              Removes the census, scoring, and public link for {group.companyName}. Cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                del.mutate(group.id, {
                  onSuccess: () => {
                    toast({ title: "Quote deleted" });
                    setConfirmDelete(false);
                  },
                  onError: (e: any) => toast({ title: "Delete failed", description: e?.message, variant: "destructive" }),
                })
              }
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmRevoke} onOpenChange={setConfirmRevoke}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke the public link?</AlertDialogTitle>
            <AlertDialogDescription>
              Anyone with the current /q/… URL will see "link not found" after this.
              You can mint a fresh link any time with Rotate link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                revoke.mutate(group.id, {
                  onSuccess: () => {
                    toast({ title: "Link revoked" });
                    setConfirmRevoke(false);
                  },
                  onError: (e: any) => toast({ title: "Revoke failed", description: e?.message, variant: "destructive" }),
                })
              }
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function StatusPill({ status }: { status: QuoteStatus }) {
  const tone: Record<QuoteStatus, string> = {
    draft:    "bg-muted text-muted-foreground",
    sent:     "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    viewed:   "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    accepted: "bg-green-500/10 text-green-700 dark:text-green-400",
    revoked:  "bg-destructive/10 text-destructive",
  };
  return (
    <Badge variant="secondary" className={cn("text-[10px] font-semibold whitespace-nowrap", tone[status])}>
      {statusLabel(status)}
    </Badge>
  );
}
