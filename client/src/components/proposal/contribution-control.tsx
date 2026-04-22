import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { money0 } from "@/lib/kennion-rates";

export type ContribMode = "percent" | "dollar";

type Props = {
  mode: ContribMode;
  value: number;
  eeRate: number;
  onChange: (mode: ContribMode, value: number) => void;
};

// Employer Contribution: % or $ toggle + slider. In $ fixed mode the slider
// is clamped to [ceil(eeRate*0.5), ceil(eeRate)] and re-baselines to 50%
// whenever the selected plan's EE rate changes, so the value always tracks
// a valid 50%+ contribution on the current plan.
export function ContributionControl({ mode, value, eeRate, onChange }: Props) {
  const minDollar = Math.max(1, Math.ceil(eeRate * 0.5));
  const maxDollar = Math.max(minDollar, Math.ceil(eeRate));

  useEffect(() => {
    if (mode !== "dollar") return;
    onChange("dollar", Math.ceil(eeRate * 0.5));
    // Re-baseline whenever the plan's EE rate changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eeRate, mode]);

  const display = mode === "dollar" ? `$${value}` : `${value}%`;

  return (
    <Card className="p-5" data-testid="card-contribution">
      <div className="text-base font-semibold">Employer Contribution</div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Choose amount paid by your company.
      </p>

      <div className="mt-4 inline-flex rounded-md border bg-muted p-0.5">
        <SegBtn
          active={mode === "percent"}
          onClick={() => onChange("percent", 50)}
          testId="toggle-percent"
        >
          %
        </SegBtn>
        <SegBtn
          active={mode === "dollar"}
          onClick={() => onChange("dollar", Math.ceil(eeRate * 0.5))}
          testId="toggle-dollar"
        >
          $ fixed
        </SegBtn>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <Slider
          value={[value]}
          min={mode === "dollar" ? minDollar : 50}
          max={mode === "dollar" ? maxDollar : 100}
          step={mode === "dollar" ? 5 : 1}
          onValueChange={(v) => onChange(mode, v[0])}
          className="flex-1"
          data-testid="slider-contribution"
        />
        <div className="min-w-[70px] text-right font-mono text-xl font-semibold tabular-nums">
          {display}
        </div>
      </div>

      <div className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        Toward EE-only medical. Min 50%. {mode === "dollar" && `(~${money0(Math.min(value, eeRate))} per employee)`}
      </div>
    </Card>
  );
}

function SegBtn({
  active,
  onClick,
  children,
  testId,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-w-[64px] rounded px-3 py-1.5 text-sm font-semibold transition",
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
      data-testid={testId}
    >
      {children}
    </button>
  );
}
