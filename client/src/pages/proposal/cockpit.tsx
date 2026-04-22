import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProposalNav } from "@/components/proposal/proposal-nav";
import { ProposalFooter } from "@/components/proposal/proposal-footer";
import { useToast } from "@/hooks/use-toast";
import { useGroupRates, useGroupCensus, useReplaceCensus, censusToMix } from "@/hooks/use-proposal";
import {
  DENTAL_PLANS,
  VISION_PLANS,
  computeMedicalTotal,
  effectiveDateOptions,
  fmtLong,
  toIsoDate,
  censusFileName,
} from "@/lib/kennion-rates";
import { GroupHeader } from "@/components/proposal/group-header";
import { EffectiveDatePicker } from "@/components/proposal/effective-date-picker";
import { ContributionControl, type ContribMode } from "@/components/proposal/contribution-control";
import { MedicalTable } from "@/components/proposal/medical-table";
import { MonthlyTotalCard } from "@/components/proposal/monthly-total-card";
import { SimpleRateTable } from "@/components/proposal/simple-rate-table";
import { SupplementalTables } from "@/components/proposal/supplemental-tables";
import { CensusModal } from "@/components/proposal/census-modal";
import type { Group } from "@shared/schema";

type Props = {
  group: Group;
  onReplaceCensus?: () => void;
  onAcceptProposal?: () => void;
  // Optional content rendered between the top nav and the main layout.
  // Used by the admin view to overlay admin-only controls on top of
  // the same cockpit the customer sees.
  bannerSlot?: React.ReactNode;
};

export function ProposalCockpit({
  group,
  onReplaceCensus,
  onAcceptProposal,
  bannerSlot,
}: Props) {
  const [effDate, setEffDate] = useState(() => effectiveDateOptions()[0]);
  const [contribMode, setContribMode] = useState<ContribMode>("percent");
  const [contribValue, setContribValue] = useState(50);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("medical");
  const [censusOpen, setCensusOpen] = useState(false);

  const { toast } = useToast();
  const ratesQuery = useGroupRates(group.id, toIsoDate(effDate));
  const censusQuery = useGroupCensus(group.id);
  const replaceCensus = useReplaceCensus(group.id);
  const plans = ratesQuery.data?.plans ?? [];
  const fileName = censusFileName(group);

  // Auto-select the top (most expensive / Platinum-tier) plan on first load.
  useEffect(() => {
    if (!selectedPlanId && plans.length > 0) {
      setSelectedPlanId(plans[0].id);
    }
  }, [plans, selectedPlanId]);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? plans[0] ?? null,
    [plans, selectedPlanId],
  );
  const eeRate = selectedPlan?.base.EE ?? 0;
  const mix = useMemo(() => censusToMix(censusQuery.data), [censusQuery.data]);

  const totals = useMemo(() => {
    if (!selectedPlan) return { gross: 0, employerCost: 0, employeeCost: 0 };
    return computeMedicalTotal(selectedPlan, mix, contribMode, contribValue);
  }, [selectedPlan, mix, contribMode, contribValue]);

  const isMedical = activeTab === "medical";

  return (
    <div className="min-h-screen bg-background">
      <ProposalNav />
      {bannerSlot}
      <div className="mx-auto max-w-[1280px] px-6 py-6">
        <div className="grid grid-cols-[300px_1fr] gap-6">
          {/* LEFT RAIL */}
          <aside className="space-y-4">
            <Card className="p-5">
              <div className="mb-3 text-base font-semibold">Effective Date</div>
              <EffectiveDatePicker value={effDate} onChange={setEffDate} />
            </Card>

            {isMedical && selectedPlan && (
              <ContributionControl
                mode={contribMode}
                value={contribValue}
                eeRate={eeRate}
                onChange={(m, v) => {
                  setContribMode(m);
                  setContribValue(v);
                }}
              />
            )}

            {isMedical && selectedPlan && (
              <MonthlyTotalCard
                planName={selectedPlan.name}
                effectiveDate={effDate}
                gross={totals.gross}
                employerCost={totals.employerCost}
                employeeCost={totals.employeeCost}
              />
            )}

            <div className="space-y-2">
              <Button
                className="w-full justify-center gap-1.5"
                onClick={onAcceptProposal}
                data-testid="button-accept-proposal"
              >
                Accept Proposal
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="w-full justify-center gap-1.5">
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </aside>

          {/* MAIN */}
          <main className="min-w-0">
            <GroupHeader
              group={group}
              census={censusQuery.data}
              onViewCensus={() => setCensusOpen(true)}
            />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
              <div className="flex items-center gap-2">
                <TabsList className="h-auto gap-1 bg-muted p-1">
                  <TabPill value="medical" count={plans.length || undefined} active={activeTab === "medical"}>
                    Medical
                  </TabPill>
                  <TabPill value="dental" count={DENTAL_PLANS.length} active={activeTab === "dental"}>
                    Dental
                  </TabPill>
                  <TabPill value="vision" count={VISION_PLANS.length} active={activeTab === "vision"}>
                    Vision
                  </TabPill>
                  <TabPill value="supplemental" active={activeTab === "supplemental"}>
                    Supplemental
                  </TabPill>
                </TabsList>
              </div>

              <TabsContent value="medical" className="mt-5 min-h-[640px] space-y-4">
                <SectionHeader
                  title="Medical Plans"
                  subtitle={
                    <>
                      Rates recalculated for <strong>{group.companyName}</strong> · effective{" "}
                      <strong>{fmtLong(effDate)}</strong>. Select a plan below to see your monthly total.
                    </>
                  }
                />
                {ratesQuery.isLoading && <div className="text-sm text-muted-foreground">Pricing…</div>}
                {ratesQuery.isError && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                    Could not load rates. Refresh to try again.
                  </div>
                )}
                {plans.length > 0 && (
                  <MedicalTable plans={plans} selectedId={selectedPlanId} onSelect={setSelectedPlanId} />
                )}
              </TabsContent>

              <TabsContent value="dental" className="mt-5 min-h-[640px] space-y-4">
                <SectionHeader title="Dental Plans" subtitle="Fixed rates · calendar year 2026" />
                <SimpleRateTable plans={DENTAL_PLANS} label="Dental Plan Name" />
              </TabsContent>

              <TabsContent value="vision" className="mt-5 min-h-[640px] space-y-4">
                <SectionHeader title="Vision Plans" subtitle="Fixed rates · calendar year 2026" />
                <SimpleRateTable plans={VISION_PLANS} label="Vision Plan Name" />
              </TabsContent>

              <TabsContent value="supplemental" className="mt-5 min-h-[640px] space-y-4">
                <SectionHeader
                  title="Supplemental Benefits"
                  subtitle="Voluntary, employee-paid, fixed rates for 2026"
                />
                <SupplementalTables />
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
      <ProposalFooter />

      <CensusModal
        open={censusOpen}
        onOpenChange={setCensusOpen}
        entries={censusQuery.data}
        censusFileName={fileName}
        submittedAt={group.submittedAt}
        locked={group.locked}
        onReplace={() => onReplaceCensus?.()}
        onSave={async (rows) => {
          try {
            await replaceCensus.mutateAsync(rows);
            toast({
              title: "Census updated",
              description: "Rates recalculated for the new roster.",
            });
          } catch (err: any) {
            toast({
              title: "Could not update census",
              description: err?.message ?? "Please try again.",
              variant: "destructive",
            });
            throw err;
          }
        }}
      />
    </div>
  );
}

function TabPill({
  value,
  count,
  active,
  children,
}: {
  value: string;
  count?: number;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <TabsTrigger
      value={value}
      className="gap-2 rounded-md px-4 py-1.5 text-sm font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground"
      data-testid={`tab-${value}`}
    >
      {children}
      {count != null && (
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
            active ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
          }`}
        >
          {count}
        </span>
      )}
    </TabsTrigger>
  );
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

