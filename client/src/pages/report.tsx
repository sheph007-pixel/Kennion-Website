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

const TIER_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: any }> = {
  preferred: { label: "Preferred", color: "text-green-700 dark:text-green-400", bgColor: "bg-green-50 dark:bg-green-950/30", borderColor: "border-green-300 dark:border-green-700", icon: CheckCircle2 },
  standard: { label: "Standard", color: "text-blue-700 dark:text-blue-400", bgColor: "bg-blue-50 dark:bg-blue-950/30", borderColor: "border-blue-300 dark:border-blue-700", icon: Activity },
  high: { label: "High", color: "text-red-700 dark:text-red-400", bgColor: "bg-red-50 dark:bg-red-950/30", borderColor: "border-red-300 dark:border-red-700", icon: AlertTriangle },
};

function ReportNav() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} data-testid="button-back-dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <KennionLogo size="md" />
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

function getTierColor(score: number) {
  if (score < 1.0) return "text-green-600 dark:text-green-400";
  if (score < 1.5) return "text-blue-600 dark:text-blue-400";
  return "text-red-600 dark:text-red-400";
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
                .tier-standard { background: #dbeafe; color: #1e40af; }
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
                <div class="score-value" style="color: ${group.riskScore && group.riskScore < 1.0 ? '#16a34a' : group.riskScore && group.riskScore < 1.5 ? '#2563eb' : '#dc2626'}">${group.riskScore?.toFixed(2) || 'N/A'}</div>
                <div class="score-label">Kennion Risk Score</div>
                <div style="margin-top: 8px;">
                  <span class="tier-badge tier-${group.riskTier || 'standard'}">${tierConfig?.label || 'Standard'} Risk</span>
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
                <p style="margin-top: 8px;"><strong>Below 1.0:</strong> Lower expected costs — classified as <strong>Preferred Risk</strong>.</p>
                <p style="margin-top: 8px;"><strong>1.0 – 1.5:</strong> Average expected costs — classified as <strong>Standard Risk</strong>.</p>
                <p style="margin-top: 8px;"><strong>1.5+:</strong> Higher expected costs — classified as <strong>High Risk</strong>.</p>
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
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
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

        {/* Risk Tier Section */}
        {group.riskScore != null ? (
          <Card className="p-6 mb-6 border-2">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              {/* Tier Indicators */}
              <div className="flex items-center gap-3">
                {(["preferred", "standard", "high"] as const).map((key) => {
                  const cfg = TIER_CONFIG[key];
                  const TIcon = cfg.icon;
                  const isActive = group.riskTier === key;
                  return (
                    <div
                      key={key}
                      className={`flex flex-col items-center gap-1.5 px-5 py-3 rounded-lg border-2 transition-all ${
                        isActive
                          ? `${cfg.bgColor} ${cfg.borderColor}`
                          : "border-transparent opacity-40"
                      }`}
                    >
                      <TIcon className={`h-4 w-4 ${isActive ? cfg.color : "text-muted-foreground"}`} />
                      <span className={`text-sm font-semibold ${isActive ? cfg.color : "text-muted-foreground"}`}>
                        {cfg.label}
                      </span>
                      {isActive && (
                        <span className={`text-2xl font-bold ${cfg.color}`} data-testid="text-gauge-score">
                          {group.riskScore.toFixed(2)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Score Summary */}
              <div className="text-center sm:text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Risk Classification</p>
                <p className={`text-xl font-bold ${tierConfig?.color || "text-foreground"}`} data-testid="text-report-tier">
                  {tierConfig?.label || "Standard"} Risk
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Score: {group.riskScore.toFixed(2)} / 2.00
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-6 mb-6 text-center">
            <Clock className="mx-auto h-8 w-8 mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Analysis pending</p>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
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

        {/* Demographics */}
        <Card className="p-6 mb-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Group Demographics
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
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
              {chars.groupSizeCategory && (
                <div className="flex items-center justify-between text-sm mb-1">
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

            <div className="sm:col-span-2">
              <p className="text-sm text-muted-foreground mb-2">Gender Distribution</p>
              <GenderChart male={group.maleCount || 0} female={group.femaleCount || 0} />
            </div>
          </div>
        </Card>

        {/* Age Distribution */}
        {chars.ageDistribution && (
          <Card className="p-6 mb-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Age Distribution
            </h2>
            <AgeDistributionChart distribution={chars.ageDistribution} />
          </Card>
        )}

        {/* Risk Factors */}
        {chars.factors && chars.factors.length > 0 && (
          <Card className="p-6 mb-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              {group.riskScore && group.riskScore < 1.0 ? (
                <TrendingDown className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              )}
              Risk Factors
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

        {/* Score Explanation */}
        <Card className="p-6 mb-6">
          <h2 className="font-semibold mb-3">Understanding the Kennion Score</h2>
          <p className="text-sm text-muted-foreground mb-4">
            A score of <strong className="text-foreground">1.0</strong> represents average expected healthcare costs.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md border p-3 bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                <span className="text-xs font-semibold text-green-700 dark:text-green-400">Preferred</span>
              </div>
              <p className="text-xs text-muted-foreground">Below 1.0</p>
            </div>
            <div className="rounded-md border p-3 bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">Standard</span>
              </div>
              <p className="text-xs text-muted-foreground">1.0 – 1.5</p>
            </div>
            <div className="rounded-md border p-3 bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <span className="text-xs font-semibold text-red-700 dark:text-red-400">High</span>
              </div>
              <p className="text-xs text-muted-foreground">1.5 and above</p>
            </div>
          </div>
        </Card>

        {/* Admin Notes */}
        {group.adminNotes && (
          <Card className="p-6 mb-6">
            <h2 className="font-semibold mb-2">Notes from Kennion</h2>
            <p className="text-sm text-muted-foreground" data-testid="text-admin-notes">{group.adminNotes}</p>
          </Card>
        )}
      </div>
    </div>
  );
}
