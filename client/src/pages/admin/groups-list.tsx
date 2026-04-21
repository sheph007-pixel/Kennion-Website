import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import {
  Building2,
  ChevronDown,
  Download,
  FileBarChart,
  Filter,
  Plus,
  Users as UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Group } from "@shared/schema";
import { AdminLayout } from "./layout";
import { useGroups } from "./hooks";
import { useGroupsFocus } from "./groups-focus-context";
import { STATUS_OPTIONS, tierConfig } from "./constants";
import { StatusBadge } from "./components/status-badge";

function censusId(id: string): string {
  return `KBA-${id.substring(0, 8).toUpperCase()}`;
}

function StatsRow({ groups }: { groups: Group[] }) {
  const counts = STATUS_OPTIONS.map((s) => ({
    ...s,
    value: groups.filter((g) => g.status === s.value).length,
  }));

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {counts.map((s) => (
        <Card
          key={s.value.toString() + s.label}
          className="border-card-border p-4"
          data-testid={`stat-${s.label.toLowerCase().replace(/\s+/g, "-")}`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
              <s.icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold leading-none tracking-tight">{s.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function exportCsv(groups: Group[]): void {
  const headers = [
    "submittedAt",
    "companyName",
    "contactName",
    "contactEmail",
    "contactPhone",
    "totalLives",
    "employeeCount",
    "spouseCount",
    "childrenCount",
    "averageAge",
    "riskScore",
    "riskTier",
    "status",
    "censusId",
  ];
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const rows = groups.map((g) =>
    [
      g.submittedAt,
      g.companyName,
      g.contactName,
      g.contactEmail,
      g.contactPhone ?? "",
      g.totalLives ?? "",
      g.employeeCount ?? "",
      g.spouseCount ?? "",
      g.childrenCount ?? "",
      g.averageAge ?? "",
      g.riskScore ?? "",
      g.riskTier ?? "",
      g.status,
      censusId(g.id),
    ].map(escape).join(","),
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = format(new Date(), "yyyy-MM-dd");
  a.href = url;
  a.download = `kennion-groups-${date}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

type RowRef = {
  id: string;
  kind: "company" | "census";
  companyKey?: string;
};

export default function AdminGroupsListPage() {
  const { data: groups, isLoading } = useGroups();
  const [, navigate] = useLocation();
  const { registerHandlers, unregisterHandlers, searchRef } = useGroupsFocus();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchValue, setSearchValue] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [focusIndex, setFocusIndex] = useState(0);
  const rowRefs = useRef<Map<number, HTMLElement>>(new Map());

  useEffect(() => {
    const input = searchRef.current;
    if (!input) return;
    const onInput = () => setSearchValue(input.value);
    input.addEventListener("input", onInput);
    setSearchValue(input.value);
    return () => input.removeEventListener("input", onInput);
  }, [searchRef]);

  const filtered = useMemo(() => {
    if (!groups) return [];
    const q = searchValue.trim().toLowerCase();
    return groups.filter((g) => {
      const matchStatus = statusFilter === "all" || g.status === statusFilter;
      const matchQuery =
        !q ||
        g.companyName.toLowerCase().includes(q) ||
        g.contactName.toLowerCase().includes(q) ||
        g.contactEmail.toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  }, [groups, statusFilter, searchValue]);

  const grouped = useMemo(() => {
    const acc = new Map<string, Group[]>();
    for (const g of filtered) {
      const list = acc.get(g.companyName) ?? [];
      list.push(g);
      acc.set(g.companyName, list);
    }
    const entries: Array<[string, Group[]]> = Array.from(acc.entries());
    for (const [, list] of entries) {
      list.sort(
        (a, b) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
      );
    }
    entries.sort(
      (a, b) =>
        new Date(b[1][0].submittedAt).getTime() -
        new Date(a[1][0].submittedAt).getTime(),
    );
    return entries;
  }, [filtered]);

  // Build a flat list of focusable rows for j/k nav.
  const flatRows = useMemo<RowRef[]>(() => {
    const out: RowRef[] = [];
    for (const [company, list] of grouped) {
      out.push({ id: `company:${company}`, kind: "company", companyKey: company });
      if (expanded.has(company)) {
        for (const g of list) {
          out.push({ id: g.id, kind: "census" });
        }
      }
    }
    return out;
  }, [grouped, expanded]);

  useEffect(() => {
    if (focusIndex >= flatRows.length) {
      setFocusIndex(Math.max(0, flatRows.length - 1));
    }
  }, [flatRows.length, focusIndex]);

  useEffect(() => {
    const handlers = {
      onMove: (delta: 1 | -1) => {
        setFocusIndex((i) => {
          const next = Math.min(flatRows.length - 1, Math.max(0, i + delta));
          const node = rowRefs.current.get(next);
          node?.scrollIntoView({ block: "nearest" });
          return next;
        });
      },
      onActivate: () => {
        const row = flatRows[focusIndex];
        if (!row) return;
        if (row.kind === "company" && row.companyKey) {
          setExpanded((prev) => {
            const s = new Set(prev);
            if (s.has(row.companyKey!)) s.delete(row.companyKey!);
            else s.add(row.companyKey!);
            return s;
          });
        } else if (row.kind === "census") {
          navigate(`/admin/groups/${row.id}`);
        }
      },
    };
    registerHandlers(handlers);
    return () => unregisterHandlers(handlers);
  }, [flatRows, focusIndex, navigate, registerHandlers, unregisterHandlers]);

  function toggleCompany(company: string) {
    setExpanded((prev) => {
      const s = new Set(prev);
      if (s.has(company)) s.delete(company);
      else s.add(company);
      return s;
    });
  }

  return (
    <AdminLayout
      crumbs={[
        { label: "Admin", href: "/admin/dashboard" },
        { label: "Groups" },
      ]}
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em]">Groups</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Grouped by company. Expand a row to see individual census submissions.
          </p>
        </div>
        <Button variant="default" className="gap-2" data-testid="button-new-group" disabled title="Clients submit new censuses from their dashboard">
          <Plus className="h-4 w-4" />
          New Group
        </Button>
      </div>

      {isLoading ? (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <StatsRow groups={groups ?? []} />
      )}

      <div className="mt-6 flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-56" data-testid="select-status-filter">
            <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="px-2.5 py-1 text-xs font-medium">
          {filtered.length} of {groups?.length ?? 0}
        </Badge>
        <div className="ml-auto">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => exportCsv(filtered)}
            disabled={filtered.length === 0}
            data-testid="button-export-csv"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card className="mt-4 overflow-hidden border-card-border">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <FileBarChart className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 font-semibold">No groups match the filter</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchValue || statusFilter !== "all"
                ? "Adjust the search or status filter."
                : "Clients' census submissions will appear here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/30 backdrop-blur">
                <tr className="border-b border-card-border text-muted-foreground">
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide">Submitted</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide">Company</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide">Contact</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide">Email</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide">Phone</th>
                  <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-wide">View</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let flatIdx = -1;
                  return grouped.map(([companyName, list]) => {
                    const isExpanded = expanded.has(companyName);
                    const latest = list[0];
                    const totalLives = list.reduce((n, g) => n + (g.totalLives ?? 0), 0);
                    flatIdx += 1;
                    const companyIdx = flatIdx;
                    const tier = tierConfig(latest.riskTier);
                    return (
                      <>
                        <tr
                          key={`company-${companyName}`}
                          ref={(el) => {
                            if (el) rowRefs.current.set(companyIdx, el);
                            else rowRefs.current.delete(companyIdx);
                          }}
                          data-focused={companyIdx === focusIndex ? "true" : undefined}
                          className={cn(
                            "cursor-pointer border-b border-card-border bg-muted/10 transition-colors hover:bg-muted/30",
                            companyIdx === focusIndex &&
                              "bg-primary/5 ring-1 ring-inset ring-primary/40",
                          )}
                          onClick={() => {
                            setFocusIndex(companyIdx);
                            toggleCompany(companyName);
                          }}
                          data-testid={`row-company-${companyName}`}
                        >
                          <td className="px-4 py-3 align-top">
                            <div>{format(new Date(latest.submittedAt), "MMM d, yy")}</div>
                            <div className="text-[11px] text-muted-foreground">Latest</div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex items-start gap-2">
                              <ChevronDown
                                className={cn(
                                  "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                                  isExpanded ? "rotate-180" : "-rotate-90",
                                )}
                              />
                              <div>
                                <div className="font-semibold">{companyName}</div>
                                <div className="text-[11px] text-muted-foreground">
                                  {list.length} submission{list.length === 1 ? "" : "s"} · {totalLives} lives
                                  {tier && (
                                    <>
                                      {" · "}
                                      <span className={cn("font-medium", tier.className)}>
                                        {tier.label}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top text-muted-foreground">{latest.contactName}</td>
                          <td className="px-4 py-3 align-top">
                            <a
                              href={`mailto:${latest.contactEmail}`}
                              className="text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {latest.contactEmail}
                            </a>
                          </td>
                          <td className="px-4 py-3 align-top text-muted-foreground">{latest.contactPhone || "—"}</td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex justify-center">
                              <StatusBadge status={latest.status} />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center align-top">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCompany(companyName);
                              }}
                            >
                              {isExpanded ? "Collapse" : "Expand"}
                            </Button>
                          </td>
                        </tr>

                        {isExpanded &&
                          list.map((g) => {
                            flatIdx += 1;
                            const idx = flatIdx;
                            return (
                              <tr
                                key={g.id}
                                ref={(el) => {
                                  if (el) rowRefs.current.set(idx, el);
                                  else rowRefs.current.delete(idx);
                                }}
                                data-focused={idx === focusIndex ? "true" : undefined}
                                className={cn(
                                  "cursor-pointer border-b border-card-border last:border-0 transition-colors hover:bg-muted/30",
                                  idx === focusIndex &&
                                    "bg-primary/5 ring-1 ring-inset ring-primary/40",
                                )}
                                onClick={() => {
                                  setFocusIndex(idx);
                                  navigate(`/admin/groups/${g.id}`);
                                }}
                                data-testid={`row-census-${g.id}`}
                              >
                                <td className="px-4 py-3 pl-12 align-top">
                                  <div>{format(new Date(g.submittedAt), "MMM d, yy")}</div>
                                  <div className="text-[11px] text-muted-foreground">
                                    {format(new Date(g.submittedAt), "h:mm a")}
                                  </div>
                                </td>
                                <td className="px-4 py-3 pl-12 align-top">
                                  <code className="font-mono text-[11px] text-muted-foreground">
                                    {censusId(g.id)}
                                  </code>
                                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                                    <UsersIcon className="h-3 w-3" /> {g.totalLives ?? 0} lives
                                  </div>
                                </td>
                                <td className="px-4 py-3 align-top text-muted-foreground">{g.contactName}</td>
                                <td className="px-4 py-3 align-top">
                                  <a
                                    href={`mailto:${g.contactEmail}`}
                                    className="text-primary hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {g.contactEmail}
                                  </a>
                                </td>
                                <td className="px-4 py-3 align-top text-muted-foreground">{g.contactPhone || "—"}</td>
                                <td className="px-4 py-3 align-top">
                                  <div className="flex justify-center">
                                    <StatusBadge status={g.status} />
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center align-top">
                                  <Button
                                    size="sm"
                                    variant="default"
                                    className="gap-1.5"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/admin/groups/${g.id}`);
                                    }}
                                  >
                                    View
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                      </>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="mt-4 text-[11px] text-muted-foreground">
        <Building2 className="mr-1 inline h-3 w-3" />
        Tip: press <kbd className="rounded border bg-muted px-1 font-mono">j</kbd> /{" "}
        <kbd className="rounded border bg-muted px-1 font-mono">k</kbd> to move the row focus,{" "}
        <kbd className="rounded border bg-muted px-1 font-mono">Enter</kbd> to open, and{" "}
        <kbd className="rounded border bg-muted px-1 font-mono">/</kbd> to jump to search.
      </p>
    </AdminLayout>
  );
}
