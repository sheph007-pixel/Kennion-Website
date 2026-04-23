import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

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

  const min = mode === "dollar" ? minDollar : 50;
  const max = mode === "dollar" ? maxDollar : 100;

  const [draft, setDraft] = useState<string>(String(value));
  useEffect(() => {
    setDraft(String(value));
  }, [value, mode]);

  function commitDraft() {
    const n = parseInt(draft, 10);
    if (!Number.isFinite(n)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.max(min, Math.min(max, n));
    if (clamped !== value) onChange(mode, clamped);
    setDraft(String(clamped));
  }

  return (
    <Card className="p-5" data-testid="card-contribution">
      <div className="text-base font-semibold">Employer Contribution</div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        You decide how much your company pays toward each employee's premium.
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

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {mode === "dollar"
          ? "With Defined Contribution, you tell us how much you can spend per employee per month."
          : "Your company pays this percent of each employee's premium; employees pay the rest."}
      </p>

      <div className="mt-3 flex items-center gap-3">
        <Slider
          value={[value]}
          min={min}
          max={max}
          step={mode === "dollar" ? 5 : 1}
          onValueChange={(v) => onChange(mode, v[0])}
          className="flex-1"
          data-testid="slider-contribution"
        />
        <div className="flex h-9 items-center rounded-md border bg-background px-2">
          {mode === "dollar" && (
            <span className="mr-0.5 text-sm text-muted-foreground">$</span>
          )}
          <input
            type="text"
            inputMode="numeric"
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commitDraft();
                e.currentTarget.blur();
              }
            }}
            aria-label={mode === "dollar" ? "Dollar amount" : "Percent"}
            className="w-12 bg-transparent text-right font-mono text-base font-semibold tabular-nums outline-none"
            data-testid="input-contribution"
          />
          {mode === "percent" && (
            <span className="ml-0.5 text-sm text-muted-foreground">%</span>
          )}
        </div>
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
