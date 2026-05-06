import { useState } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Mirror of server/ai-audit.ts AuditPair shape. Imported here to keep
// the badge component self-contained and runtime-checked at the
// boundary (TanStack Query gives us the raw JSON).
export interface AuditItem {
  key: string;
  label: string;
  passed: boolean;
  finding?: string;
}
export interface AuditResult {
  system: "claude" | "openai";
  model: string;
  items: AuditItem[];
  passed_count: number;
  total: number;
  score_pct: number;
  all_passed: boolean;
  error?: string;
}
export interface AuditPair {
  actuary_i: AuditResult;
  actuary_ii: AuditResult;
  agreement: "both_pass" | "both_fail" | "disagree" | "incomplete";
  audited_at: string;
  schema_version?: number;
}

const ACTUARY_LABELS = {
  actuary_i: { name: "AI Actuary I", system: "Claude" },
  actuary_ii: { name: "AI Actuary II", system: "OpenAI" },
} as const;

type Slot = "actuary_i" | "actuary_ii";

// ─── Full admin badges ────────────────────────────────────────────────
//
// Two side-by-side badges, click to expand the 16-item checklist. If
// auditResults is null the admin sees a "Run audit" button; if either
// side errored, a "Retry" button. onReAudit is the callback that
// triggers POST /api/admin/proposals/:id/re-audit.

export function AIActuaryBadges({
  audit,
  onReAudit,
  isReAuditing,
}: {
  audit: AuditPair | null | undefined;
  onReAudit?: () => void;
  isReAuditing?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!audit) {
    return (
      <Card className="border-dashed bg-muted/30 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <div className="font-medium">AI Actuary audit pending</div>
              <div className="text-xs text-muted-foreground">
                Two independent AIs (Claude + OpenAI) will fact-check this proposal.
              </div>
            </div>
          </div>
          {onReAudit && (
            <Button
              size="sm"
              variant="outline"
              onClick={onReAudit}
              disabled={isReAuditing}
              data-testid="button-run-audit"
            >
              {isReAuditing ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Running…
                </>
              ) : (
                <>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Run audit
                </>
              )}
            </Button>
          )}
        </div>
      </Card>
    );
  }

  const banner =
    audit.agreement === "both_pass"
      ? null
      : audit.agreement === "both_fail"
        ? {
            tone: "destructive",
            icon: <XCircle className="h-4 w-4" />,
            text: "Both auditors flagged issues. Review the findings before sending.",
          }
        : audit.agreement === "disagree"
          ? {
              tone: "warning",
              icon: <AlertTriangle className="h-4 w-4" />,
              text: "Auditors disagree — one passed, one flagged a finding.",
            }
          : {
              tone: "muted",
              icon: <RefreshCw className="h-4 w-4" />,
              text: "Audit incomplete — one or both providers didn't return.",
            };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-stretch gap-px bg-border">
        <BadgeTile
          slot="actuary_i"
          result={audit.actuary_i}
          auditedAt={audit.audited_at}
        />
        <BadgeTile
          slot="actuary_ii"
          result={audit.actuary_ii}
          auditedAt={audit.audited_at}
        />
      </div>
      {banner && (
        <div
          className={cn(
            "flex items-start gap-2 px-4 py-2 text-xs",
            banner.tone === "destructive" && "bg-destructive/10 text-destructive",
            banner.tone === "warning" && "bg-amber-500/10 text-amber-700 dark:text-amber-400",
            banner.tone === "muted" && "bg-muted text-muted-foreground",
          )}
        >
          {banner.icon}
          <span>{banner.text}</span>
        </div>
      )}
      <div className="flex items-center justify-between gap-2 border-t bg-muted/30 px-4 py-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          data-testid="button-toggle-audit-checklist"
        >
          {expanded ? (
            <>
              Hide checklist
              <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              View checklist
              <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
        {onReAudit && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onReAudit}
            disabled={isReAuditing}
            data-testid="button-re-audit"
            className="h-7 gap-1.5 text-xs"
          >
            {isReAuditing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            Re-run
          </Button>
        )}
      </div>
      {expanded && <ChecklistDetail audit={audit} />}
    </Card>
  );
}

function BadgeTile({
  slot,
  result,
  auditedAt,
}: {
  slot: Slot;
  result: AuditResult;
  auditedAt: string;
}) {
  const meta = ACTUARY_LABELS[slot];
  const errored = !!result.error;
  const tone = errored
    ? "muted"
    : result.all_passed
      ? "success"
      : result.score_pct >= 75
        ? "warning"
        : "destructive";
  const stamp = (() => {
    try {
      return format(new Date(auditedAt), "MMM d, yyyy · h:mma").toLowerCase();
    } catch {
      return auditedAt;
    }
  })();

  return (
    <div
      className={cn(
        "flex-1 bg-card p-4",
        tone === "success" && "bg-green-500/5",
        tone === "warning" && "bg-amber-500/5",
        tone === "destructive" && "bg-destructive/5",
      )}
      data-testid={`badge-${slot}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <ShieldCheck className="h-3 w-3" />
            {meta.name}
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span
              className={cn(
                "text-2xl font-bold tabular-nums",
                tone === "success" && "text-green-700 dark:text-green-400",
                tone === "warning" && "text-amber-700 dark:text-amber-400",
                tone === "destructive" && "text-destructive",
                tone === "muted" && "text-muted-foreground",
              )}
            >
              {errored ? "—" : `${result.score_pct}%`}
            </span>
            {!errored && (
              <span className="text-xs text-muted-foreground">
                {result.passed_count}/{result.total}
              </span>
            )}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {meta.system} · {result.model}
          </div>
        </div>
        <div className="shrink-0">
          {errored ? (
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          ) : result.all_passed ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <XCircle className="h-5 w-5 text-destructive" />
          )}
        </div>
      </div>
      <div className="mt-2 text-[10px] text-muted-foreground">
        {errored ? result.error : `audited ${stamp}`}
      </div>
    </div>
  );
}

function ChecklistDetail({ audit }: { audit: AuditPair }) {
  // Item keys are identical & ordered for both auditors; pivot into
  // a side-by-side row per item.
  const i = audit.actuary_i;
  const ii = audit.actuary_ii;
  const rows: Array<{
    key: string;
    label: string;
    iPass: boolean;
    iFinding?: string;
    iiPass: boolean;
    iiFinding?: string;
  }> = [];
  const seen = new Set<string>();
  for (const it of i.items) {
    const match = ii.items.find((x) => x.key === it.key);
    rows.push({
      key: it.key,
      label: it.label,
      iPass: it.passed,
      iFinding: it.finding,
      iiPass: match?.passed ?? false,
      iiFinding: match?.finding,
    });
    seen.add(it.key);
  }
  for (const it of ii.items) {
    if (!seen.has(it.key)) {
      rows.push({
        key: it.key,
        label: it.label,
        iPass: false,
        iFinding: "Not returned",
        iiPass: it.passed,
        iiFinding: it.finding,
      });
    }
  }
  if (rows.length === 0) {
    return (
      <div className="border-t bg-muted/20 p-4 text-xs text-muted-foreground">
        No checklist items returned.{" "}
        {i.error || ii.error
          ? "One or both auditors errored — see Re-run."
          : null}
      </div>
    );
  }

  return (
    <div className="border-t bg-muted/10">
      <table className="w-full text-xs">
        <thead className="bg-muted/40">
          <tr>
            <th className="w-1/2 px-4 py-2 text-left font-medium">Check</th>
            <th className="w-24 px-3 py-2 text-center font-medium">AI I</th>
            <th className="w-24 px-3 py-2 text-center font-medium">AI II</th>
            <th className="px-4 py-2 text-left font-medium">Finding</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const finding = r.iFinding || r.iiFinding;
            return (
              <tr key={r.key} className="border-t">
                <td className="px-4 py-2">{r.label}</td>
                <td className="px-3 py-2 text-center">
                  {r.iPass ? (
                    <CheckCircle2 className="mx-auto h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="mx-auto h-4 w-4 text-destructive" />
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  {r.iiPass ? (
                    <CheckCircle2 className="mx-auto h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="mx-auto h-4 w-4 text-destructive" />
                  )}
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {finding ?? <span className="text-green-700 dark:text-green-400">passed</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Compact status (for bulk results table) ──────────────────────────

export function AIActuaryStatus({ audit }: { audit: AuditPair | null | undefined }) {
  if (!audit) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3 w-3" />
        Pending
      </span>
    );
  }
  const dot = (passed: boolean, errored: boolean) =>
    errored ? (
      <AlertTriangle className="h-3 w-3 text-muted-foreground" />
    ) : passed ? (
      <CheckCircle2 className="h-3 w-3 text-green-600" />
    ) : (
      <XCircle className="h-3 w-3 text-destructive" />
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px]">
      <span className="inline-flex items-center gap-0.5">
        <span className="text-muted-foreground">I</span>
        {dot(audit.actuary_i.all_passed, !!audit.actuary_i.error)}
      </span>
      <span className="inline-flex items-center gap-0.5">
        <span className="text-muted-foreground">II</span>
        {dot(audit.actuary_ii.all_passed, !!audit.actuary_ii.error)}
      </span>
    </span>
  );
}

// ─── Public-safe badges (prospect-facing /q/:token) ───────────────────
//
// Renders nothing if audit summary is missing — server only sends the
// summary when both = 100%, so this component never displays a partial
// or failed audit to a prospect.

export interface PublicAuditSummary {
  audited_at: string;
  actuary_i: { system: string; model: string; score_pct: number };
  actuary_ii: { system: string; model: string; score_pct: number };
}

export function AIActuaryBadgesPublic({
  audit,
}: {
  audit: PublicAuditSummary | null | undefined;
}) {
  if (!audit) return null;
  const stamp = (() => {
    try {
      return format(new Date(audit.audited_at), "MMM d, yyyy");
    } catch {
      return audit.audited_at;
    }
  })();
  return (
    <Card className="overflow-hidden">
      <div className="flex items-stretch gap-px bg-border">
        {(["actuary_i", "actuary_ii"] as const).map((slot) => {
          const meta = ACTUARY_LABELS[slot];
          const r = audit[slot];
          return (
            <div
              key={slot}
              className="flex-1 bg-green-500/5 p-4"
              data-testid={`public-badge-${slot}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    <ShieldCheck className="h-3 w-3" />
                    {meta.name}
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold tabular-nums text-green-700 dark:text-green-400">
                      {r.score_pct}%
                    </span>
                    <span className="text-xs text-muted-foreground">verified</span>
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {meta.system}
                  </div>
                </div>
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5 border-t bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground">
        <Badge variant="secondary" className="text-[10px]">
          Audited
        </Badge>
        <span>
          Two independent AI actuaries reviewed every aspect of this proposal on{" "}
          {stamp}.
        </span>
      </div>
    </Card>
  );
}
