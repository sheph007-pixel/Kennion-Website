import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_OPTIONS, type StatusValue } from "../constants";

const BADGE_CLASSES: Record<StatusValue, string> = {
  census_uploaded:
    "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  approved:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  proposal_sent:
    "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  proposal_accepted:
    "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  client:
    "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  not_approved:
    "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
};

export function StatusBadge({
  status,
  className,
  showIcon = true,
}: {
  status: string;
  className?: string;
  showIcon?: boolean;
}) {
  const opt = STATUS_OPTIONS.find((s) => s.value === status);
  const Icon = opt?.icon;
  const classes =
    opt && BADGE_CLASSES[opt.value as StatusValue]
      ? BADGE_CLASSES[opt.value as StatusValue]
      : "bg-muted text-muted-foreground";

  return (
    <Badge
      variant="secondary"
      className={cn("gap-1 font-medium", classes, className)}
      data-testid={`status-badge-${status}`}
    >
      {showIcon && Icon && <Icon className="h-3 w-3" />}
      {opt?.label ?? status}
    </Badge>
  );
}
