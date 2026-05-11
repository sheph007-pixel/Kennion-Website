import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, ShieldCheck, ShieldAlert, ShieldQuestion, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type ScreenResult = {
  id: string;
  model_version: string;
  model_hash: string;
  kri: number;
  tier: "Preferred" | "Standard" | "High Risk";
  decision: "QUOTE" | "QUOTE_WITH_REVIEW" | "DECLINE";
  n_members: number;
  n_employees: number;
  avg_age: number;
  median_age: number;
  pct_female: number;
  top_county: string;
  pct_top_county: number;
  pct_medicare_cliff: number;
  demographic: { normalized: number };
  geographic:  { normalized: number };
  composition: { normalized: number };
  ai_summary: string;
  top_drivers: Array<{ category: string; text: string; impact: number }>;
};

function tierStyle(tier?: string) {
  if (tier === "Preferred")
    return { bg: "bg-green-600 hover:bg-green-700", icon: <ShieldCheck className="h-3.5 w-3.5" /> };
  if (tier === "High Risk")
    return { bg: "bg-red-600 hover:bg-red-700",   icon: <ShieldAlert className="h-3.5 w-3.5" /> };
  if (tier === "Standard")
    return { bg: "bg-blue-600 hover:bg-blue-700", icon: <ShieldQuestion className="h-3.5 w-3.5" /> };
  return { bg: "", icon: null };
}

function bar(label: string, norm: number, key: string) {
  // 0.5..1.6 maps to 0..100%
  const pct = Math.min(Math.max((norm - 0.5) / 1.1, 0), 1) * 100;
  const color = norm < 0.95 ? "bg-green-500" : norm >= 1.5 ? "bg-red-500" : "bg-blue-500";
  return (
    <div key={key} className="flex items-center gap-3 py-1">
      <div className="w-28 text-xs text-muted-foreground">{label}</div>
      <div className="flex-1 h-2.5 bg-muted rounded relative">
        <div className={`h-2.5 rounded ${color}`} style={{ width: `${pct}%` }} />
        <div className="absolute top-0 left-[45.45%] h-2.5 w-px bg-foreground/40" />
      </div>
      <div className="w-12 text-xs font-mono text-right">{norm.toFixed(2)}</div>
    </div>
  );
}

export function RiskScreenButton({ groupId, effectiveDate }: { groupId: string; effectiveDate?: Date | string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [latest, setLatest] = useState<ScreenResult | null>(null);

  // Fetch the latest existing screen so the button reflects prior state on page load.
  useQuery({
    queryKey: ["/api/screen/latest", groupId],
    queryFn: async () => {
      try {
        const r = await fetch(`/api/screen/latest/${groupId}`, { credentials: "include" });
        if (!r.ok) return null;
        const data = (await r.json()) as ScreenResult;
        setLatest(data);
        return data;
      } catch {
        return null;
      }
    },
    enabled: !!groupId,
    staleTime: 60_000,
  });

  const run = useMutation({
    mutationFn: async () => {
      const body: any = {};
      if (effectiveDate) {
        const d = effectiveDate instanceof Date ? effectiveDate : new Date(effectiveDate as any);
        if (!isNaN(d.getTime())) body.effectiveDate = d.toISOString();
      }
      const res = await apiRequest("POST", `/api/screen/run/${groupId}`, body);
      return (await res.json()) as ScreenResult;
    },
    onSuccess: (data) => {
      setLatest(data);
      setOpen(true);
      toast({
        title: `Risk Screen: ${data.tier}`,
        description: `Score ${data.kri.toFixed(2)} - ${data.decision.replace(/_/g, " ")}`,
        variant: data.tier === "High Risk" ? "destructive" : "default",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Risk Screen failed",
        description: err?.message || String(err),
        variant: "destructive",
      });
    },
  });

  const style = tierStyle(latest?.tier);

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => (latest ? setOpen(true) : run.mutate())}
          disabled={run.isPending}
          className={latest ? `text-white ${style.bg}` : ""}
          data-testid="button-risk-screen"
        >
          {run.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              {style.icon}
              {latest
                ? <span className="ml-1.5">{latest.tier} · Score {latest.kri.toFixed(2)}</span>
                : <span className="ml-1.5">Run Risk Screen</span>}
            </>
          )}
        </Button>
        {latest && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => run.mutate()}
            disabled={run.isPending}
            data-testid="button-risk-screen-rerun"
          >
            Re-run
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {style.icon}
              <span>Kennion Risk Screen</span>
              {latest && (
                <span
                  className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-white text-xs font-semibold ${style.bg}`}
                >
                  {latest.tier}
                </span>
              )}
            </DialogTitle>
            {latest && (
              <DialogDescription>
                Kennion Score <span className="font-mono font-semibold">{latest.kri.toFixed(2)}</span>
                {"  ·  Recommendation: "}<span className="font-semibold">{latest.decision.replace(/_/g, " ")}</span>
              </DialogDescription>
            )}
          </DialogHeader>

          {latest && (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold mb-2">Score breakdown</div>
                {bar("Demographic", latest.demographic.normalized, "d")}
                {bar("Geographic",  latest.geographic.normalized,  "g")}
                {bar("Composition", latest.composition.normalized, "c")}
              </div>

              <div>
                <div className="text-sm font-semibold mb-1">AI Summary</div>
                <p className="text-sm text-muted-foreground">{latest.ai_summary}</p>
              </div>

              <div>
                <div className="text-sm font-semibold mb-1">Top drivers</div>
                <ul className="space-y-1">
                  {latest.top_drivers.map((d, i) => (
                    <li key={i} className="text-sm flex gap-2">
                      <span
                        className={`font-mono w-12 ${d.impact > 0 ? "text-red-600" : "text-green-600"}`}
                      >
                        {d.impact >= 0 ? "+" : ""}{d.impact.toFixed(2)}
                      </span>
                      <span className="flex-1">
                        <span className="font-semibold">{d.category}:</span> {d.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {(latest as any).plan_projections && (latest as any).plan_projections.length > 0 && (
                <div className="pt-3 border-t">
                  <div className="text-xs font-semibold mb-2">Funding vs Predicted Claims (richest plan / cheapest plan)</div>
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground">
                      <tr className="border-b">
                        <th className="text-left py-1 font-normal">Plan</th>
                        <th className="text-right py-1 font-normal">Funding PMPM</th>
                        <th className="text-right py-1 font-normal">Claims PMPM</th>
                        <th className="text-right py-1 font-normal">Loss Ratio</th>
                        <th className="text-right py-1 font-normal">Margin / mo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(latest as any).plan_projections.map((p: any) => (
                        <tr key={p.plan} className="border-b last:border-0">
                          <td className="py-1 font-medium">{p.plan}</td>
                          <td className="text-right tabular-nums">${p.funding_pmpm.toLocaleString()}</td>
                          <td className="text-right tabular-nums">${p.claims_pmpm.toLocaleString()}</td>
                          <td className={`text-right tabular-nums font-semibold ${p.loss_ratio > 1 ? "text-red-600" : "text-green-600"}`}>
                            {(p.loss_ratio * 100).toFixed(0)}%
                          </td>
                          <td className={`text-right tabular-nums font-semibold ${p.margin >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {p.margin >= 0 ? "+" : ""}${p.margin.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="pt-3 border-t">
                <div className="text-xs font-semibold mb-2">12-Month Forecast (Kennion AI)</div>
                <div className="grid grid-cols-4 gap-3 text-xs">
                  <div>
                    <div className="text-muted-foreground">Claims PMPM</div>
                    <div className="font-bold text-base">
                      {typeof (latest as any).predicted_pmpm === "number"
                        ? `$${(latest as any).predicted_pmpm.toLocaleString()}`
                        : "—"}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      book mean ${(latest as any).book_mean_pmpm?.toLocaleString?.() ?? "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">PMPY</div>
                    <div className="font-semibold text-sm">
                      {typeof (latest as any).predicted_pmpy === "number"
                        ? `$${(latest as any).predicted_pmpy.toLocaleString()}`
                        : "—"}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      book ${(latest as any).book_mean_pmpy?.toLocaleString?.() ?? "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Annual claims</div>
                    <div className="font-semibold text-sm">
                      {typeof (latest as any).predicted_annual_claims === "number"
                        ? `$${(latest as any).predicted_annual_claims.toLocaleString()}`
                        : "—"}
                    </div>
                    <div className="text-[10px] text-muted-foreground">12-mo paid</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Claims PEPM</div>
                    <div className="font-semibold text-sm">
                      {typeof (latest as any).predicted_pepm === "number"
                        ? `$${(latest as any).predicted_pepm.toLocaleString()}`
                        : "—"}
                    </div>
                    <div className="text-[10px] text-muted-foreground">vs funding PEPM</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-3 pt-2 border-t text-xs">
                <div><div className="text-muted-foreground">Lives</div><div className="font-semibold">{latest.n_members}</div></div>
                <div><div className="text-muted-foreground">Employees</div><div className="font-semibold">{latest.n_employees}</div></div>
                <div><div className="text-muted-foreground">Avg age</div><div className="font-semibold">{latest.avg_age.toFixed(1)}</div></div>
                <div><div className="text-muted-foreground">Female %</div><div className="font-semibold">{(latest.pct_female * 100).toFixed(0)}%</div></div>
                <div><div className="text-muted-foreground">Medicare cliff</div><div className="font-semibold">{(latest.pct_medicare_cliff * 100).toFixed(0)}%</div></div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {latest && (
              <Button
                variant="outline"
                onClick={() => window.open(`/api/screen/pdf/${latest.id}`, "_blank")}
                data-testid="button-risk-screen-pdf"
              >
                <FileText className="h-4 w-4 mr-1.5" />
                Open PDF
              </Button>
            )}
            <Button
              onClick={() => run.mutate()}
              disabled={run.isPending}
              data-testid="button-risk-screen-rescore"
            >
              {run.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Re-score now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
