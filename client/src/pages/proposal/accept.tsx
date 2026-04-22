import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ProposalNav } from "@/components/proposal/proposal-nav";
import { DENTAL_PLANS, VISION_PLANS, effectiveDateOptions, fmtLong, fmtMonthYear, money } from "@/lib/kennion-rates";
import { useGroupRates } from "@/hooks/use-proposal";
import type { Group } from "@shared/schema";
import { cn } from "@/lib/utils";

type Props = {
  group: Group;
  onBack: () => void;
  onDone: () => void;
};

type AcceptState = {
  effectiveDate: Date;
  medicalPlanId: string | null;
  dentalPlanIds: string[];
  visionPlanIds: string[];
  supplementalIds: string[];
  signerName: string;
  signerTitle: string;
  authorized: boolean;
};

const SUPP_OPTIONS = [
  { id: "life_add", label: "Voluntary Life / AD&D" },
  { id: "accident", label: "Accident Insurance" },
  { id: "critical", label: "Critical Illness" },
  { id: "cancer", label: "Cancer Insurance" },
  { id: "hospital", label: "Hospital Insurance" },
  { id: "std", label: "Short-Term Disability" },
];

export function ProposalAccept({ group, onBack, onDone }: Props) {
  const options = effectiveDateOptions();
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [state, setState] = useState<AcceptState>({
    effectiveDate: options[0],
    medicalPlanId: null,
    dentalPlanIds: [],
    visionPlanIds: [],
    supplementalIds: [],
    signerName: "",
    signerTitle: "",
    authorized: false,
  });

  const rates = useGroupRates(group.id, state.effectiveDate.toISOString().slice(0, 10));
  const plans = rates.data?.plans ?? [];

  useEffect(() => {
    if (!state.medicalPlanId && plans.length > 0) {
      setState((s) => ({ ...s, medicalPlanId: plans[0].id }));
    }
  }, [plans, state.medicalPlanId]);

  const selectedMedical = plans.find((p) => p.id === state.medicalPlanId);

  const steps = [
    { title: "Effective date", subtitle: "Pick when coverage should start." },
    { title: "Medical plan", subtitle: "Choose one medical plan for your group." },
    { title: "Dental & Vision", subtitle: "Select any dental and vision plans you'd like to offer." },
    { title: "Supplemental", subtitle: "Choose any optional voluntary benefits." },
    { title: "Who's signing?", subtitle: "We need a contact to finalize the kickoff." },
    { title: "Review & authorize", subtitle: "One last look, then we take it from here." },
  ];

  const canContinue = useMemo(() => {
    if (step === 1) return Boolean(state.medicalPlanId);
    if (step === 4) return state.signerName.trim().length > 0 && state.signerTitle.trim().length > 0;
    if (step === 5) return state.authorized;
    return true;
  }, [step, state]);

  const onNext = () => {
    if (!canContinue) return;
    if (step < steps.length - 1) setStep(step + 1);
    else handleSubmit();
  };
  const onPrev = () => {
    if (step === 0) onBack();
    else setStep(step - 1);
  };

  const handleSubmit = async () => {
    // TODO: POST to /api/groups/:id/accept once the endpoint ships.
    // For now, we no-op and show the confirmation.
    console.log("[accept-proposal]", { groupId: group.id, ...state });
    setSubmitted(true);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !submitted) {
        const target = e.target as HTMLElement | null;
        if (target?.tagName === "INPUT" && (target as HTMLInputElement).type !== "checkbox") return;
        onNext();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <ProposalNav />
        <div className="mx-auto max-w-xl px-6 py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle2 className="h-8 w-8 text-green-700 dark:text-green-400" />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight">Proposal accepted</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Your Kennion advisor will reach out within 1 business day to schedule a kickoff call
            and finalize enrollment for {group.companyName}.
          </p>
          <Button className="mt-6" onClick={onDone}>
            Back to proposal
          </Button>
        </div>
      </div>
    );
  }

  const current = steps[step];

  return (
    <div className="min-h-screen bg-background">
      <ProposalNav />
      <div className="mx-auto max-w-2xl px-6 pb-28 pt-10">
        <Progress value={((step + 1) / steps.length) * 100} className="mb-10 h-1" />

        <div className="mb-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
            Step {step + 1} of {steps.length}
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{current.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{current.subtitle}</p>
        </div>

        {step === 0 && (
          <div className="space-y-2">
            {options.map((d) => {
              const iso = d.toISOString().slice(0, 10);
              const active = iso === state.effectiveDate.toISOString().slice(0, 10);
              return (
                <ChoiceRow
                  key={iso}
                  active={active}
                  onClick={() => setState({ ...state, effectiveDate: d })}
                  title={fmtMonthYear(d)}
                  subtitle={fmtLong(d)}
                />
              );
            })}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-2">
            {rates.isLoading && <div className="text-sm text-muted-foreground">Pricing…</div>}
            {plans.map((p) => {
              const active = p.id === state.medicalPlanId;
              return (
                <ChoiceRow
                  key={p.id}
                  active={active}
                  onClick={() => setState({ ...state, medicalPlanId: p.id })}
                  title={p.name}
                  subtitle={`${p.tier ?? ""}${p.note ? ` · ${p.note}` : ""}`}
                  meta={money(p.base.EE) + " / mo EE"}
                />
              );
            })}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            <MultiSection
              title="Dental"
              options={DENTAL_PLANS.map((d) => ({ id: d.id, label: d.name, meta: money(d.rates.EE) + " / mo EE" }))}
              selectedIds={state.dentalPlanIds}
              onToggle={(id) =>
                setState((s) => ({
                  ...s,
                  dentalPlanIds: s.dentalPlanIds.includes(id)
                    ? s.dentalPlanIds.filter((x) => x !== id)
                    : [...s.dentalPlanIds, id],
                }))
              }
            />
            <MultiSection
              title="Vision"
              options={VISION_PLANS.map((v) => ({ id: v.id, label: v.name, meta: money(v.rates.EE) + " / mo EE" }))}
              selectedIds={state.visionPlanIds}
              onToggle={(id) =>
                setState((s) => ({
                  ...s,
                  visionPlanIds: s.visionPlanIds.includes(id)
                    ? s.visionPlanIds.filter((x) => x !== id)
                    : [...s.visionPlanIds, id],
                }))
              }
            />
          </div>
        )}

        {step === 3 && (
          <MultiSection
            title=""
            options={SUPP_OPTIONS}
            selectedIds={state.supplementalIds}
            onToggle={(id) =>
              setState((s) => ({
                ...s,
                supplementalIds: s.supplementalIds.includes(id)
                  ? s.supplementalIds.filter((x) => x !== id)
                  : [...s.supplementalIds, id],
              }))
            }
          />
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="signer-name">Full name</Label>
              <Input
                id="signer-name"
                value={state.signerName}
                onChange={(e) => setState({ ...state, signerName: e.target.value })}
                placeholder="Your full legal name"
                data-testid="input-signer-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signer-title">Title</Label>
              <Input
                id="signer-title"
                value={state.signerTitle}
                onChange={(e) => setState({ ...state, signerTitle: e.target.value })}
                placeholder="e.g. CEO, HR Director"
                data-testid="input-signer-title"
              />
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5">
            <Card className="p-5">
              <dl className="space-y-2 text-sm">
                <Row label="Group">{group.companyName}</Row>
                <Row label="Effective date">{fmtLong(state.effectiveDate)}</Row>
                <Row label="Medical plan">{selectedMedical?.name ?? "Not selected"}</Row>
                <Row label="Dental">
                  {state.dentalPlanIds.length
                    ? state.dentalPlanIds
                        .map((id) => DENTAL_PLANS.find((p) => p.id === id)?.name)
                        .filter(Boolean)
                        .join(", ")
                    : "None"}
                </Row>
                <Row label="Vision">
                  {state.visionPlanIds.length
                    ? state.visionPlanIds
                        .map((id) => VISION_PLANS.find((p) => p.id === id)?.name)
                        .filter(Boolean)
                        .join(", ")
                    : "None"}
                </Row>
                <Row label="Supplemental">
                  {state.supplementalIds.length
                    ? state.supplementalIds
                        .map((id) => SUPP_OPTIONS.find((s) => s.id === id)?.label)
                        .filter(Boolean)
                        .join(", ")
                    : "None"}
                </Row>
                <Row label="Signer">
                  {state.signerName || "Unknown"}, {state.signerTitle || "Unknown"}
                </Row>
              </dl>
            </Card>
            <label className="flex cursor-pointer items-start gap-3 rounded-md border bg-card p-4 text-sm hover-elevate">
              <input
                type="checkbox"
                checked={state.authorized}
                onChange={(e) => setState({ ...state, authorized: e.target.checked })}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              <span>
                I authorize Kennion Benefit Advisors to start the enrollment process for{" "}
                <strong>{group.companyName}</strong> and contact me to schedule a kickoff call.
              </span>
            </label>
          </div>
        )}

        <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-6 py-3">
            <Button variant="outline" onClick={onPrev} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              {step === 0 ? "Back to proposal" : "Back"}
            </Button>
            <div className="hidden text-xs text-muted-foreground sm:block">
              Press <kbd className="rounded border bg-muted px-1.5">Enter</kbd> to continue
            </div>
            <Button onClick={onNext} disabled={!canContinue} className="gap-1.5" data-testid="button-accept-next">
              {step === steps.length - 1 ? "Submit" : "Continue"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChoiceRow({
  active,
  onClick,
  title,
  subtitle,
  meta,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
  meta?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-md border p-4 text-left transition",
        active ? "border-primary bg-primary/5 text-foreground" : "border-border bg-card hover-elevate",
      )}
    >
      <div>
        <div className={cn("text-base font-semibold", active && "text-primary")}>{title}</div>
        {subtitle && <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>}
      </div>
      {meta && <div className="font-mono text-sm text-muted-foreground tabular-nums">{meta}</div>}
    </button>
  );
}

function MultiSection({
  title,
  options,
  selectedIds,
  onToggle,
}: {
  title: string;
  options: { id: string; label: string; meta?: string }[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {title && <div className="text-sm font-semibold text-foreground">{title}</div>}
      {options.map((o) => {
        const active = selectedIds.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onToggle(o.id)}
            className={cn(
              "flex w-full items-center justify-between rounded-md border p-3 text-left transition",
              active ? "border-primary bg-primary/5" : "border-border bg-card hover-elevate",
            )}
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded border",
                  active ? "border-primary bg-primary text-primary-foreground" : "border-input",
                )}
                aria-hidden
              >
                {active && <CheckCircle2 className="h-3 w-3" />}
              </span>
              <span className="text-sm font-medium">{o.label}</span>
            </div>
            {o.meta && <span className="font-mono text-xs text-muted-foreground tabular-nums">{o.meta}</span>}
          </button>
        );
      })}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm">{children}</dd>
    </div>
  );
}
