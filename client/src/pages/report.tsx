import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import {
  ArrowLeft,
  Building2,
  Users,
  UserCheck,
  Heart,
  Baby,
  Activity,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  FileDown,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Home,
} from "lucide-react";
import { KennionLogo } from "@/components/kennion-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Group, CensusEntry } from "@shared/schema";
import { LogOut } from "lucide-react";

const TIER_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  preferred: { label: "Preferred Risk", color: "text-green-700 dark:text-green-400", bgColor: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800", icon: CheckCircle2 },
  standard: { label: "Standard Risk", color: "text-yellow-700 dark:text-yellow-400", bgColor: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800", icon: Activity },
  high: { label: "High Risk", color: "text-red-700 dark:text-red-400", bgColor: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800", icon: AlertTriangle },
};

function ReportNav() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="cursor-pointer" onClick={() => navigate("/dashboard")}>
            <KennionLogo size="md" />
          </div>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <button
              onClick={() => navigate("/dashboard")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Dashboard
            </button>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium text-foreground">Report</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            onClick={() => navigate("/dashboard")}
            data-testid="button-back-dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-sm text-muted-foreground">{user?.fullName}</span>
          <ThemeToggle />
          <Button size="icon" variant="ghost" onClick={async () => { await logout(); navigate("/"); }} data-testid="button-logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </nav>
  );
}

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const percentage = Math.min(100, Math.max(0, ((2.0 - score) / 1.6) * 100));
  const getColor = () => {
    if (score < 0.85) return "text-green-600 dark:text-green-400";
    if (score <= 1.15) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="text-center">
      <div className="relative inline-flex items-center justify-center">
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="8" className="text-border" />
          <circle
            cx="60" cy="60" r="50" fill="none" strokeWidth="8"
            className={getColor()}
            stroke="currentColor"
            strokeDasharray={`${percentage * 3.14} ${314 - percentage * 3.14}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${getColor()}`} data-testid="text-gauge-score">
            {score.toFixed(2)}
          </span>
        </div>
      </div>
      <p className="text-sm font-medium mt-2">{label}</p>
    </div>
  );
}

function AgeDistributionChart({ distribution }: { distribution: Record<string, number> }) {
  const maxVal = Math.max(...Object.values(distribution), 1);
  const orderedKeys = ["Under 18", "18-29", "30-39", "40-49", "50-59", "60+"];
  const filtered = orderedKeys.filter(k => distribution[k] !== undefined);

  return (
    <div className="space-y-2">
      {filtered.map((range) => {
        const count = distribution[range] || 0;
        const pct = maxVal > 0 ? (count / maxVal) * 100 : 0;
        return (
          <div key={range} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-16 text-right">{range}</span>
            <div className="flex-1 h-5 bg-border/30 rounded-sm overflow-hidden">
              <div
                className="h-full bg-primary/70 rounded-sm transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-medium w-8">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function GenderChart({ male, female }: { male: number; female: number }) {
  const total = male + female || 1;
  const mPct = Math.round((male / total) * 100);
  const fPct = 100 - mPct;

  return (
    <div>
      <div className="flex h-6 rounded-md overflow-hidden border">
        <div className="bg-blue-500/70 dark:bg-blue-400/50 transition-all flex items-center justify-center" style={{ width: `${mPct}%` }}>
          {mPct > 10 && <span className="text-xs font-medium text-white">{mPct}%</span>}
        </div>
        <div className="bg-pink-500/70 dark:bg-pink-400/50 transition-all flex items-center justify-center" style={{ width: `${fPct}%` }}>
          {fPct > 10 && <span className="text-xs font-medium text-white">{fPct}%</span>}
        </div>
      </div>
      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <span>Male: {male}</span>
        <span>Female: {female}</span>
      </div>
    </div>
  );
}

export default function ReportPage() {
  const [, params] = useRoute("/report/:id");
  const [, navigate] = useLocation();
  const groupId = params?.id;

  const { data: group, isLoading: groupLoading } = useQuery<Group>({
    queryKey: ["/api/groups", groupId],
    queryFn: async () => {
      const res = await fetch(`/api/groups/${groupId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load group");
      return res.json();
    },
    enabled: !!groupId,
  });

  const { data: census } = useQuery<CensusEntry[]>({
    queryKey: ["/api/groups", groupId, "census"],
    queryFn: async () => {
      const res = await fetch(`/api/groups/${groupId}/census`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load census");
      return res.json();
    },
    enabled: !!groupId,
  });

  if (groupLoading) {
    return (
      <div className="min-h-screen bg-background">
        <ReportNav />
        <div className="mx-auto max-w-5xl px-6 py-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-background">
        <ReportNav />
        <div className="mx-auto max-w-5xl px-6 py-8 text-center">
          <h2 className="text-xl font-semibold">Report not found</h2>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const chars = (group.groupCharacteristics || {}) as any;
  const tierConfig = group.riskTier ? TIER_CONFIG[group.riskTier] : null;
  const TierIcon = tierConfig?.icon || Activity;

  const handleDownloadPdf = () => {
    const printContent = document.getElementById("report-content");
    if (printContent) {
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(`
          <html>
            <head>
              <title>Kennion Risk Report - ${group.companyName}</title>
              <style>
                body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1a1a1a; max-width: 800px; margin: 0 auto; }
                h1 { font-size: 24px; margin-bottom: 4px; }
                h2 { font-size: 18px; margin-top: 32px; margin-bottom: 12px; border-bottom: 1px solid #e5e5e5; padding-bottom: 8px; }
                .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0; }
                .stat { background: #f9f9f9; padding: 12px; border-radius: 6px; }
                .stat-label { font-size: 12px; color: #666; }
                .stat-value { font-size: 20px; font-weight: 700; }
                .score-box { text-align: center; padding: 24px; background: #f0f7ff; border-radius: 8px; margin: 16px 0; }
                .score-value { font-size: 48px; font-weight: 800; }
                .score-label { font-size: 14px; color: #666; }
                .tier-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; }
                .tier-preferred { background: #dcfce7; color: #166534; }
                .tier-standard { background: #fef9c3; color: #854d0e; }
                .tier-high { background: #fecaca; color: #991b1b; }
                .factor { padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
                .explanation { background: #f9fafb; padding: 16px; border-radius: 8px; font-size: 13px; line-height: 1.6; }
                .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #999; }
              </style>
            </head>
            <body>
              <h1>Kennion Benefit Advisors</h1>
              <p class="subtitle">Group Risk Analysis Report</p>

              <h2>${group.companyName}</h2>
              <p class="subtitle">Submitted ${new Date(group.submittedAt).toLocaleDateString()} | Census #KBA-${group.id.substring(0, 8).toUpperCase()}</p>

              <div class="grid">
                <div class="stat"><div class="stat-label">Employees (EE)</div><div class="stat-value">${group.employeeCount}</div></div>
                <div class="stat"><div class="stat-label">Spouses (SP)</div><div class="stat-value">${group.spouseCount || 0}</div></div>
                <div class="stat"><div class="stat-label">Dependents (DEP)</div><div class="stat-value">${group.dependentCount}</div></div>
                <div class="stat"><div class="stat-label">Total Lives</div><div class="stat-value">${group.totalLives}</div></div>
              </div>

              <div class="score-box">
                <div class="score-value" style="color: ${group.riskScore && group.riskScore < 0.85 ? '#16a34a' : group.riskScore && group.riskScore <= 1.15 ? '#ca8a04' : '#dc2626'}">${group.riskScore?.toFixed(2) || 'N/A'}</div>
                <div class="score-label">Kennion Risk Score</div>
                <div style="margin-top: 8px;">
                  <span class="tier-badge tier-${group.riskTier || 'standard'}">${tierConfig?.label || 'Standard Risk'}</span>
                </div>
              </div>

              <div class="grid">
                <div class="stat"><div class="stat-label">Average Age</div><div class="stat-value">${group.averageAge?.toFixed(1) || 'N/A'}</div></div>
                <div class="stat"><div class="stat-label">Avg Employee Age</div><div class="stat-value">${chars.averageEmployeeAge || 'N/A'}</div></div>
                <div class="stat"><div class="stat-label">Gender (M/F)</div><div class="stat-value">${group.maleCount || 0} / ${group.femaleCount || 0}</div></div>
                <div class="stat"><div class="stat-label">Group Size</div><div class="stat-value">${chars.groupSizeCategory || 'N/A'}</div></div>
              </div>

              ${chars.factors && chars.factors.length > 0 ? `
                <h2>Risk Factors</h2>
                ${chars.factors.map((f: string) => `<div class="factor">${f}</div>`).join('')}
              ` : ''}

              <h2>Score Explanation</h2>
              <div class="explanation">
                <p>The Kennion Score of 1.0 represents the average baseline for a group with average expected healthcare costs.</p>
                <p style="margin-top: 8px;"><strong>Under 1.0:</strong> Lower expected costs. These groups are classified as Preferred Risk.</p>
                <p style="margin-top: 8px;"><strong>1.0 to 1.5:</strong> Moderate expected costs. These groups are classified as Standard Risk and qualify for our program.</p>
                <p style="margin-top: 8px;"><strong>Above 1.5:</strong> Higher expected costs. These groups are classified as High Risk and typically require fully-insured plans.</p>
                <p style="margin-top: 12px;"><strong>Risk Tiers:</strong> Preferred (Under 1.0) | Standard (1.0-1.5) | High (Above 1.5)</p>
                <p style="margin-top: 8px; font-size: 12px; color: #666;">We only accept Preferred and Standard risk groups into the Kennion level-funded program.</p>
              </div>

              <div class="footer">
                <p>Generated by Kennion Benefit Advisors | ${new Date().toLocaleDateString()}</p>
                <p>This report is for informational purposes only. Actual rates and coverage may vary.</p>
              </div>
            </body>
          </html>
        `);
        win.document.close();
        win.print();
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <ReportNav />
      <div className="mx-auto max-w-5xl px-6 py-8" id="report-content">
        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight" data-testid="text-report-title">
                {group.companyName}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground" data-testid="text-census-number">
              Census #KBA-{group.id.substring(0, 8).toUpperCase()} | Submitted {new Date(group.submittedAt).toLocaleDateString()}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} data-testid="button-download-report">
            <FileDown className="mr-1.5 h-3.5 w-3.5" /> Download Report
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <UserCheck className="h-3.5 w-3.5" /> Employees
            </div>
            <div className="text-2xl font-bold" data-testid="text-report-ee">{group.employeeCount}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Heart className="h-3.5 w-3.5" /> Spouses
            </div>
            <div className="text-2xl font-bold" data-testid="text-report-sp">{group.spouseCount || 0}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Baby className="h-3.5 w-3.5" /> Dependents
            </div>
            <div className="text-2xl font-bold" data-testid="text-report-dep">{group.dependentCount}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Users className="h-3.5 w-3.5" /> Total Lives
            </div>
            <div className="text-2xl font-bold" data-testid="text-report-total">{group.totalLives}</div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Kennion Risk Score
            </h2>

            {group.riskScore != null ? (
              <div className="flex flex-col items-center">
                <ScoreGauge score={group.riskScore} label="Risk Score" />

                {tierConfig && (
                  <div className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-md border ${tierConfig.bgColor}`}>
                    <TierIcon className={`h-4 w-4 ${tierConfig.color}`} />
                    <span className={`font-semibold text-sm ${tierConfig.color}`} data-testid="text-report-tier">
                      {tierConfig.label}
                    </span>
                  </div>
                )}

                {group.score != null && (
                  <div className="mt-4 text-center">
                    <div className="text-xs text-muted-foreground">Qualification Score</div>
                    <div className="text-lg font-bold">{group.score}/100</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="mx-auto h-8 w-8 mb-2" />
                <p className="text-sm">Analysis pending</p>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Group Demographics
            </h2>

            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Average Age</span>
                  <span className="font-semibold" data-testid="text-report-avg-age">{group.averageAge?.toFixed(1) || "N/A"}</span>
                </div>
                {chars.averageEmployeeAge && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Avg Employee Age</span>
                    <span className="font-semibold">{chars.averageEmployeeAge}</span>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Gender Distribution</p>
                <GenderChart male={group.maleCount || 0} female={group.femaleCount || 0} />
              </div>

              {chars.groupSizeCategory && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Group Category</span>
                  <Badge variant="secondary">{chars.groupSizeCategory}</Badge>
                </div>
              )}

              {chars.dependencyRatio != null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Dependency Ratio</span>
                  <span className="font-semibold">{chars.dependencyRatio}</span>
                </div>
              )}
            </div>
          </Card>
        </div>

        {chars.ageDistribution && (
          <Card className="p-6 mb-8">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Age Distribution
            </h2>
            <AgeDistributionChart distribution={chars.ageDistribution} />
          </Card>
        )}

        {chars.factors && chars.factors.length > 0 && (
          <Card className="p-6 mb-8">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              {group.riskScore && group.riskScore <= 1.0 ? (
                <TrendingDown className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <TrendingUp className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              )}
              Group Risk Characteristics
            </h2>
            <div className="space-y-2">
              {chars.factors.map((factor: string, i: number) => (
                <div key={i} className="flex items-start gap-2 py-2 border-b border-border/50 last:border-0">
                  <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                  <span className="text-sm">{factor}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-6 mb-8 bg-primary/5 border-primary/20">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Detailed Actuarial Analysis
          </h2>
          <div className="space-y-4 text-sm leading-relaxed">
            <p>
              Our team has completed a comprehensive risk assessment of your group using our proprietary MARA (Multi-factor Actuarial Risk Analysis) model.
              This advanced system evaluates over 50 different risk factors to predict your group's expected healthcare costs with high accuracy.
            </p>

            <div className="pl-4 border-l-2 border-primary/30 space-y-3">
              <p className="font-medium text-foreground">What We Analyzed:</p>
              <ul className="space-y-2 text-muted-foreground">
                <li>• <strong>Age distribution:</strong> We looked at how ages are spread across your group. Younger groups usually have lower costs,
                while groups with more people over 50 tend to have higher medical expenses.</li>
                <li>• <strong>Gender mix:</strong> Different health needs between men and women affect overall costs. A balanced mix usually provides
                the most stable results.</li>
                <li>• <strong>Family coverage:</strong> We examined how many employees have spouses and children on their plan. More dependents
                can spread risk but also increase total claims.</li>
                <li>• <strong>Group size:</strong> Larger groups benefit from risk pooling, while smaller groups can see bigger swings in costs
                from year to year.</li>
                <li>• <strong>Geographic factors:</strong> Healthcare costs vary by location. We factor in regional pricing differences based
                on your employees' zip codes.</li>
              </ul>
            </div>

            <p>
              Our MARA model compares your group to thousands of similar employee groups across the country. The score you see reflects how your
              group's risk profile matches up against this national benchmark. A score of <strong className="text-foreground">1.0</strong> means
              your group is right at the average — 50% of groups are higher risk and 50% are lower risk.
            </p>

            {group.riskScore != null && group.riskScore < 1.0 && (
              <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4">
                <p className="font-medium text-green-700 dark:text-green-400 mb-2">✓ Your Group Shows Favorable Risk Factors</p>
                <p className="text-sm text-green-600/90 dark:text-green-400/90">
                  Your score of <strong>{group.riskScore.toFixed(2)}</strong> means we expect your healthcare costs to be about{" "}
                  <strong>{Math.round((1 - group.riskScore) * 100)}% lower</strong> than an average group. This puts you in a great position
                  for level-funded health plans. Groups like yours typically see stable premiums and often receive claims refunds at year-end.
                </p>
              </div>
            )}

            {group.riskScore != null && group.riskScore >= 1.0 && group.riskScore <= 1.5 && (
              <div className="rounded-md bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 p-4">
                <p className="font-medium text-yellow-700 dark:text-yellow-400 mb-2">Standard Risk Profile</p>
                <p className="text-sm text-yellow-600/90 dark:text-yellow-400/90">
                  Your score of <strong>{group.riskScore.toFixed(2)}</strong> indicates your expected healthcare costs are about{" "}
                  <strong>{Math.round((group.riskScore - 1) * 100)}% higher</strong> than average. You still qualify for our program,
                  and we can offer competitive rates. Many successful groups fall in this range and benefit from level-funded plans.
                </p>
              </div>
            )}

            {group.riskScore != null && group.riskScore > 1.5 && (
              <div className="rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4">
                <p className="font-medium text-red-700 dark:text-red-400 mb-2">High Risk Indicators Detected</p>
                <p className="text-sm text-red-600/90 dark:text-red-400/90">
                  Your score of <strong>{group.riskScore.toFixed(2)}</strong> suggests expected costs about{" "}
                  <strong>{Math.round((group.riskScore - 1) * 100)}% higher</strong> than average. Unfortunately, this falls outside our
                  underwriting guidelines for level-funded plans. Hunter will reach out to discuss alternative coverage options that may
                  better fit your group's needs.
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6 mb-8">
          <h2 className="font-semibold mb-4">Understanding Your Kennion Score</h2>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              The Kennion Score uses a simple scale where <strong className="text-foreground">1.0</strong> represents average expected healthcare costs.
              Think of it like a cost multiplier — a score of 0.80 means you'll likely spend 80% of what an average group spends, while 1.20
              means you'll likely spend 120% of average.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-md border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="font-medium text-foreground">Score Under 1.0</span>
                </div>
                <p className="text-xs">
                  Lower risk. Groups scoring under <strong>1.0</strong> are classified as <strong>Preferred Risk</strong>.
                  These groups typically have younger, healthier populations and see lower medical claims.
                </p>
              </div>
              <div className="rounded-md border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="font-medium text-foreground">Score 1.0 - 1.5</span>
                </div>
                <p className="text-xs">
                  Moderate risk. Groups in the <strong>1.0 to 1.5</strong> range are <strong>Standard Risk</strong>.
                  These groups qualify for our program and can benefit from level-funded health plans.
                </p>
              </div>
            </div>
            <div className="rounded-md border p-4 bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="font-medium text-foreground">Score Above 1.5</span>
              </div>
              <p className="text-xs">
                Higher risk. Groups scoring above <strong>1.5</strong> are classified as <strong>High Risk</strong>.
                These groups typically need fully-insured plans. We only accept Preferred and Standard risk groups into our level-funded program.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 pt-2 border-t">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="text-xs font-medium">Preferred Risk: Under 1.0</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <span className="text-xs font-medium">Standard Risk: 1.0 - 1.5</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span className="text-xs font-medium">High Risk: Above 1.5</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 mb-8 border-primary/20">
          <h2 className="font-semibold mb-4">About the Kennion Program</h2>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              The Kennion Program specializes in <strong className="text-foreground">level-funded health plans</strong> for small and mid-sized
              businesses. Unlike traditional insurance, level funding lets you pay a fixed monthly amount while potentially earning money back
              if your claims are lower than expected.
            </p>
            <p>
              <strong className="text-foreground">Why we can offer better rates:</strong> We carefully underwrite each group before acceptance.
              By only taking Preferred and Standard risk groups, we keep our overall claims lower than fully-insured carriers who must accept
              everyone. These savings get passed directly to you through lower monthly premiums.
            </p>
            <p>
              <strong className="text-foreground">Our risk analysis advantage:</strong> Most brokers rely on insurance carrier underwriting.
              We built our own MARA system to analyze groups upfront. This means you get an accurate quote faster, and you'll know right away
              if you qualify — no waiting weeks for carrier responses.
            </p>
          </div>
        </Card>

        {group.adminNotes && (
          <Card className="p-6 mb-8">
            <h2 className="font-semibold mb-2">Notes from Kennion</h2>
            <p className="text-sm text-muted-foreground" data-testid="text-admin-notes">{group.adminNotes}</p>
          </Card>
        )}
      </div>
    </div>
  );
}
