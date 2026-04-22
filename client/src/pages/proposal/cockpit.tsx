import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Download, LogOut, User, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { KennionLogo } from "@/components/kennion-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { useGroupRates, useGroupCensus, censusToMix } from "@/hooks/use-proposal";
import {
  DENTAL_PLANS,
  VISION_PLANS,
  computeMedicalTotal,
  effectiveDateOptions,
  fmtLong,
  toIsoDate,
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
};

export function ProposalCockpit({ group, onReplaceCensus, onAcceptProposal }: Props) {
  const [effDate, setEffDate] = useState(() => effectiveDateOptions()[0]);
  const [contribMode, setContribMode] = useState<ContribMode>("percent");
  const [contribValue, setContribValue] = useState(50);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("medical");
  const [censusOpen, setCensusOpen] = useState(false);

  const ratesQuery = useGroupRates(group.id, toIsoDate(effDate));
  const censusQuery = useGroupCensus(group.id);
  const plans = ratesQuery.data?.plans ?? [];

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
      <TopNav />
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
              companyName={group.companyName}
              tier={group.riskTier as any}
              employees={group.employeeCount ?? 0}
              coveredLives={group.totalLives ?? 0}
              medianAge={group.averageAge != null ? Math.round(group.averageAge) : null}
              censusFileName={`${group.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_census.csv`}
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
                <div className="flex-1" />
                <a
                  href="https://KennionProgram.com"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  Plan details <ExternalLink className="h-3 w-3" />
                </a>
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
                  badge={
                    <Badge variant="secondary" className="gap-1">
                      <RefreshCw className="h-3 w-3" />
                      Live rates
                    </Badge>
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

      <CensusModal
        open={censusOpen}
        onOpenChange={setCensusOpen}
        entries={censusQuery.data}
        censusFileName={`${group.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_census.csv`}
        submittedAt={group.submittedAt}
        onReplace={() => onReplaceCensus?.()}
        // TODO: wire to PATCH /api/groups/:id/census when the endpoint ships.
        onSave={async () => {
          // Placeholder: invalidate queries so any server-side roster update
          // flows into the UI. The PATCH wiring belongs on the server next.
          await queryClient.invalidateQueries({ queryKey: ["/api/groups", group.id, "census"] });
          await queryClient.invalidateQueries({ queryKey: ["/api/rate/price-group", group.id] });
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
  badge,
}: {
  title: string;
  subtitle: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {badge}
    </div>
  );
}

function TopNav() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  async function handleLogout() {
    await logout();
    navigate("/");
  }
  return (
    <nav className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-6 py-3">
        <KennionLogo size="md" />
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 rounded-md bg-muted/50 px-3 py-1.5 sm:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-medium">{user?.fullName}</span>
              <span className="text-xs text-muted-foreground">{user?.email}</span>
            </div>
          </div>
          <ThemeToggle />
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </nav>
  );
}
