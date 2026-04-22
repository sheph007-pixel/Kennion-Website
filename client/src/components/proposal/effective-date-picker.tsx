import { effectiveDateOptions, fmtMonthYear } from "@/lib/kennion-rates";
import { cn } from "@/lib/utils";

type Props = {
  value: Date;
  onChange: (d: Date) => void;
};

export function EffectiveDatePicker({ value, onChange }: Props) {
  const options = effectiveDateOptions();
  return (
    <div className="flex flex-col gap-1.5" data-testid="picker-effective-date">
      {options.map((d) => {
        const iso = d.toISOString().slice(0, 10);
        const active = iso === value.toISOString().slice(0, 10);
        return (
          <button
            key={iso}
            type="button"
            onClick={() => onChange(d)}
            className={cn(
              "w-full rounded-md border px-3 py-2 text-left text-sm font-semibold transition",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-foreground hover-elevate",
            )}
            data-testid={`option-effective-${iso}`}
          >
            {fmtMonthYear(d)}
          </button>
        );
      })}
    </div>
  );
}
