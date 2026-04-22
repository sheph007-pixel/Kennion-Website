import { useEffect, useState } from "react";
import { Brain, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { KennionLogo } from "@/components/kennion-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { queryClient } from "@/lib/queryClient";
import type { Group } from "@shared/schema";

type Props = {
  group?: Group | null;
  onComplete: () => void;
};

const MESSAGES = [
  { text: "Parsing census data", pct: 8 },
  { text: "Validating employee records", pct: 18 },
  { text: "Analyzing age distribution", pct: 28 },
  { text: "Evaluating demographic risk factors", pct: 38 },
  { text: "Running actuarial models", pct: 52 },
  { text: "Cross-referencing regional data", pct: 66 },
  { text: "Applying underwriting criteria", pct: 78 },
  { text: "Determining qualification tier", pct: 90 },
  { text: "Finalizing Kennion Score", pct: 98 },
  { text: "Analysis complete", pct: 100 },
];

export function ProposalAnalyzing({ group, onComplete }: Props) {
  const [idx, setIdx] = useState(0);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const total = 18000;
    const step = total / MESSAGES.length;
    let i = 0;
    const id = setInterval(() => {
      i++;
      if (i >= MESSAGES.length) {
        clearInterval(id);
        setIdx(MESSAGES.length - 1);
        setPct(100);
        queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
        setTimeout(onComplete, 700);
        return;
      }
      setIdx(i);
      setPct(MESSAGES[i].pct);
    }, step);
    return () => clearInterval(id);
  }, [onComplete]);

  const msg = MESSAGES[idx];

  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between border-b px-6 py-3">
        <KennionLogo size="md" />
        <ThemeToggle />
      </nav>
      <div className="mx-auto max-w-xl px-6 py-16">
        <Card className="p-8 text-center">
          <div className="mx-auto flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-primary/10">
            <Brain className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mt-5 text-xl font-bold tracking-tight">Analyzing Your Census</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Our AI underwriting engine is evaluating your group's risk profile.
          </p>

          <div className="mx-auto mt-6 max-w-sm">
            <Progress value={pct} className="h-2.5" />
            <div className="mt-2 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 animate-pulse text-primary" />
                <span className="font-medium text-muted-foreground">{msg.text}</span>
              </div>
              <span className="font-mono tabular-nums text-muted-foreground">{Math.round(pct)}%</span>
            </div>
          </div>

          <div className="mx-auto mt-6 grid max-w-md grid-cols-4 gap-3 border-t pt-6">
            <Stat label="Employees" value={group?.employeeCount} />
            <Stat label="Spouses" value={group?.spouseCount} />
            <Stat label="Children" value={group?.childrenCount} />
            <Stat label="Total" value={group?.totalLives} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-lg font-bold tabular-nums">{value ?? "…"}</div>
    </div>
  );
}
