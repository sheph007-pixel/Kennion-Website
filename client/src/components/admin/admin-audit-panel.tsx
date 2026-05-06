import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useProposalsForGroup } from "@/pages/admin/hooks";
import {
  AIActuaryBadges,
  type AuditPair,
} from "@/components/ai-actuary-badges";
import type { Group } from "@shared/schema";

// Sits just below the AdminBanner on the admin cockpit. Pulls the
// latest proposal for the group, surfaces its dual-AI audit verdict,
// and exposes a "Run audit / Re-run" button that calls
// /api/admin/proposals/:id/re-audit. Hidden completely when the
// group has no proposals yet — the admin cockpit's existing
// "generate proposal" affordance lives elsewhere.
export function AdminAuditPanel({ group }: { group: Group }) {
  const { toast } = useToast();
  const { data: proposals } = useProposalsForGroup(group.id);
  const latest = proposals?.[0];
  const audit = (latest?.auditResults as AuditPair | null | undefined) ?? null;

  const reAudit = useMutation({
    mutationFn: async (proposalId: string) => {
      const res = await apiRequest(
        "POST",
        `/api/admin/proposals/${proposalId}/re-audit`,
        {},
      );
      return (await res.json()) as { auditResults: AuditPair };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/proposal/group", group.id],
      });
      toast({ title: "Audit refreshed" });
    },
    onError: (err: any) => {
      toast({
        title: "Audit failed",
        description: err?.message,
        variant: "destructive",
      });
    },
  });

  // No proposals yet → nothing to audit. The cockpit's existing
  // "Download PDF" / "Generate proposal" path will create one and the
  // audit will run automatically.
  if (!latest) return null;

  return (
    <div className="border-b bg-background">
      <div className="mx-auto max-w-[1280px] px-6 py-4">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          AI Actuary Audit
        </div>
        <AIActuaryBadges
          audit={audit}
          onReAudit={() => reAudit.mutate(latest.id)}
          isReAuditing={reAudit.isPending}
        />
      </div>
    </div>
  );
}
