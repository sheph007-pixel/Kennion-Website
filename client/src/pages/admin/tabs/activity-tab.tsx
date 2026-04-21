import { useMemo } from "react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Info, FileCheck2, FileUp, PencilLine, CheckCircle2, type LucideIcon } from "lucide-react";
import type { Group, Proposal } from "@shared/schema";
import { useProposalsForGroup } from "../hooks";
import { statusLabel } from "../constants";

type Event = {
  at: string | Date;
  title: string;
  meta?: string;
  icon: LucideIcon;
};

export function ActivityTab({ group }: { group: Group }) {
  const { data: proposals } = useProposalsForGroup(group.id);

  const events = useMemo<Event[]>(() => {
    const out: Event[] = [];
    out.push({
      at: group.submittedAt,
      title: "Census submitted",
      meta: `${group.totalLives ?? 0} lives · contact ${group.contactName}`,
      icon: FileUp,
    });
    if (group.updatedAt && new Date(group.updatedAt).getTime() !== new Date(group.submittedAt).getTime()) {
      out.push({
        at: group.updatedAt,
        title: `Status: ${statusLabel(group.status)}`,
        meta: group.adminNotes ? "Notes updated" : undefined,
        icon: PencilLine,
      });
    }
    if (proposals) {
      for (const p of proposals as Proposal[]) {
        out.push({
          at: p.createdAt,
          title: "Proposal generated",
          meta: p.fileName,
          icon: FileCheck2,
        });
      }
    }
    if (group.status === "client") {
      out.push({
        at: group.updatedAt,
        title: "Converted to client",
        icon: CheckCircle2,
      });
    }
    return out.sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
    );
  }, [group, proposals]);

  return (
    <Card className="border-card-border p-5">
      <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        <span>
          Events are derived from submission / update timestamps and generated
          proposals — not a true audit log. Full event tracking ships with
          per-action auditing.
        </span>
      </div>

      <ol className="relative mt-5 space-y-5">
        <span
          aria-hidden
          className="absolute left-[9px] top-2 bottom-2 w-px bg-card-border"
        />
        {events.map((e, i) => (
          <li key={i} className="relative pl-8">
            <span className="absolute left-0 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 ring-4 ring-background">
              <e.icon className="h-3 w-3 text-primary" />
            </span>
            <div className="text-sm font-medium">{e.title}</div>
            {e.meta && (
              <div className="mt-0.5 text-[11px] text-muted-foreground">{e.meta}</div>
            )}
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {e.at ? format(new Date(e.at), "MMM d, yyyy 'at' h:mm a") : ""}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
