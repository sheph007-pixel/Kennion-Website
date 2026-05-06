import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  AIActuaryBadges,
  type AuditPair,
} from "@/components/ai-actuary-badges";
import type { Group } from "@shared/schema";

// Sits just below the AdminBanner on the admin cockpit. Reads the
// dual-AI audit verdict directly off the group (server caches it on
// `groups.audit_results`) and exposes a "Run audit / Re-run" button
// that calls /api/admin/groups/:id/audit. Always renders — even
// when no audit has run yet — so the admin always sees the panel
// and can kick off the first audit with one click.
export function AdminAuditPanel({ group }: { group: Group }) {
  const { toast } = useToast();
  const audit =
    ((group as any)?.auditResults as AuditPair | null | undefined) ?? null;

  const reAudit = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `/api/admin/groups/${group.id}/audit`,
        {},
      );
      return (await res.json()) as { auditResults: AuditPair };
    },
    onSuccess: () => {
      // useGroupForAdmin pulls /api/groups/:id directly — invalidate
      // that key so the freshly persisted audit shows up immediately.
      // Also invalidate the admin lists so quote rows reflect the
      // new audit state if/when those surfaces add a column.
      queryClient.invalidateQueries({ queryKey: ["/api/groups", group.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/quotes"] });
      toast({ title: "Audit complete" });
    },
    onError: (err: any) => {
      toast({
        title: "Audit failed",
        description: err?.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="border-b bg-background">
      <div className="mx-auto max-w-[1280px] px-6 py-4">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          AI Actuary Audit
        </div>
        <AIActuaryBadges
          audit={audit}
          onReAudit={() => reAudit.mutate()}
          isReAuditing={reAudit.isPending}
        />
      </div>
    </div>
  );
}
