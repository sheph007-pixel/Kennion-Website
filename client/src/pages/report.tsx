import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useState } from "react";
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
  ChevronDown,
  Home,
  Info,
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

// Industry benchmarks
const BENCHMARKS = {
  medianAge: 36.69,
  avgFamilySize: 1.91,
  femalePercentage: 50.96,
};

const TIER_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: any; tabColor: string }> = {
  preferred: {
    label: "Preferred Risk",
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
    tabColor: "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400",
    icon: CheckCircle2
  },
  standard: {
    label: "Standard Risk",
    color: "text-yellow-700 dark:text-yellow-400",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800",
    tabColor: "border-yellow-500 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    icon: Activity
  },
  high: {
    label: "High Risk",
    color: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
    tabColor: "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400",
    icon: AlertTriangle
  },
};

function getGroupCategory(totalLives: number): string {
  if (totalLives >= 51) return "Large";
  if (totalLives >= 15) return "Small";
  return "Micro";
}

function getComparison(value: number, benchmark: number): { diff: number; isAbove: boolean; text: string } {
  const diff = Math.abs(value - benchmark);
  const percentage = ((diff / benchmark) * 100).toFixed(1);
  const isAbove = value > benchmark;
  return {
    diff,
    isAbove,
    text: `${percentage}% ${isAbove ? 'above' : 'below'} benchmark`
  };
}

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
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [advantageExpanded, setAdvantageExpanded] = useState(false);

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

  // Calculate metrics
  const groupCategory = getGroupCategory(group.totalLives || 0);
  const medianAge = group.averageAge || 0;
  const employeeAge = chars.averageEmployeeAge || 0;
  const totalPeople = group.totalLives || 1;
  const avgFamilySize = totalPeople / (group.employeeCount || 1);
  const femaleCount = group.femaleCount || 0;
  const maleCount = group.maleCount || 0;
  const totalGender = femaleCount + maleCount || 1;
  const femalePercentage = (femaleCount / totalGender) * 100;
  const dependencyRatio = ((group.spouseCount || 0) + (group.dependentCount || 0)) / (group.employeeCount || 1);

  // Benchmark comparisons
  const medianAgeComp = getComparison(medianAge, BENCHMARKS.medianAge);
  const familySizeComp = getComparison(avgFamilySize, BENCHMARKS.avgFamilySize);
  const genderComp = getComparison(femalePercentage, BENCHMARKS.femalePercentage);

  const handleDownloadPdf = () => {
    const win = window.open("", "_blank");
    if (win) {
      const tierColor = group.riskTier === 'preferred' ? '#16a34a' : group.riskTier === 'standard' ? '#ca8a04' : '#dc2626';
      const tierBg = group.riskTier === 'preferred' ? '#dcfce7' : group.riskTier === 'standard' ? '#fef9c3' : '#fee2e2';

      win.document.write(`
        <html>
          <head>
            <title>Kennion Risk Report - ${group.companyName}</title>
            <style>
              @page { size: letter; margin: 0; }
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: 'Inter', -apple-system, system-ui, sans-serif;
                width: 8.5in;
                height: 11in;
                padding: 0.5in;
                color: #1a1a1a;
                background: white;
              }

              .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 24px;
                padding-bottom: 16px;
                border-bottom: 3px solid ${tierColor};
              }

              .logo {
                font-size: 28px;
                font-weight: 800;
                color: #2563eb;
              }

              .report-date {
                text-align: right;
                font-size: 11px;
                color: #666;
              }

              .company-section {
                background: linear-gradient(135deg, ${tierBg} 0%, white 100%);
                padding: 24px;
                border-radius: 12px;
                margin-bottom: 20px;
                border-left: 6px solid ${tierColor};
              }

              .company-name {
                font-size: 28px;
                font-weight: 700;
                color: #1a1a1a;
                margin-bottom: 6px;
              }

              .census-id {
                font-size: 12px;
                color: #666;
              }

              .risk-tier-banner {
                background: ${tierColor};
                color: white;
                padding: 16px 24px;
                border-radius: 12px;
                text-align: center;
                margin-bottom: 20px;
              }

              .tier-label {
                font-size: 14px;
                font-weight: 500;
                opacity: 0.9;
                margin-bottom: 4px;
              }

              .tier-value {
                font-size: 32px;
                font-weight: 800;
              }

              .stats-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 12px;
                margin-bottom: 20px;
              }

              .stat-card {
                background: #f8fafc;
                border: 2px solid #e2e8f0;
                border-radius: 10px;
                padding: 16px;
                text-align: center;
              }

              .stat-label {
                font-size: 11px;
                color: #64748b;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 6px;
              }

              .stat-value {
                font-size: 32px;
                font-weight: 800;
                color: #1a1a1a;
              }

              .score-section {
                display: grid;
                grid-template-columns: 1fr 2fr;
                gap: 20px;
                margin-bottom: 20px;
              }

              .score-card {
                background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                border: 2px solid #bae6fd;
                border-radius: 12px;
                padding: 20px;
                text-align: center;
              }

              .score-number {
                font-size: 56px;
                font-weight: 900;
                color: ${tierColor};
                line-height: 1;
                margin-bottom: 8px;
              }

              .score-label-text {
                font-size: 13px;
                color: #0369a1;
                font-weight: 600;
              }

              .demographics-card {
                background: white;
                border: 2px solid #e2e8f0;
                border-radius: 12px;
                padding: 20px;
              }

              .demo-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 16px;
              }

              .demo-item {
                text-align: center;
              }

              .demo-label {
                font-size: 10px;
                color: #64748b;
                font-weight: 600;
                text-transform: uppercase;
                margin-bottom: 4px;
              }

              .demo-value {
                font-size: 22px;
                font-weight: 700;
                color: #1a1a1a;
              }

              .risk-segments {
                background: #fafafa;
                border: 2px solid #e5e5e5;
                border-radius: 10px;
                padding: 16px;
                margin-bottom: 16px;
              }

              .segments-title {
                font-size: 12px;
                font-weight: 700;
                color: #1a1a1a;
                margin-bottom: 12px;
                text-align: center;
              }

              .segment-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 6px 0;
              }

              .segment-label {
                font-size: 11px;
                font-weight: 600;
              }

              .segment-value {
                font-size: 13px;
                font-weight: 700;
              }

              .low-risk { color: #16a34a; }
              .avg-risk { color: #ca8a04; }
              .high-risk { color: #dc2626; }

              .footer {
                position: absolute;
                bottom: 0.5in;
                left: 0.5in;
                right: 0.5in;
                padding-top: 16px;
                border-top: 2px solid #e5e5e5;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 10px;
                color: #666;
              }

              .contact-info {
                font-weight: 600;
                color: #2563eb;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">KENNION</div>
              <div class="report-date">
                Group Risk Analysis<br>
                Generated ${new Date().toLocaleDateString()}
              </div>
            </div>

            <div class="company-section">
              <div class="company-name">${group.companyName}</div>
              <div class="census-id">Census #KBA-${group.id.substring(0, 8).toUpperCase()} · Submitted ${new Date(group.submittedAt).toLocaleDateString()}</div>
            </div>

            <div class="risk-tier-banner">
              <div class="tier-label">Risk Classification</div>
              <div class="tier-value">${tierConfig?.label || 'Standard Risk'}</div>
            </div>

            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-label">Employees</div>
                <div class="stat-value">${group.employeeCount}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Spouses</div>
                <div class="stat-value">${group.spouseCount || 0}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Dependents</div>
                <div class="stat-value">${group.dependentCount || 0}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Total Lives</div>
                <div class="stat-value">${group.totalLives}</div>
              </div>
            </div>

            <div class="score-section">
              <div class="score-card">
                <div class="score-number">${group.riskScore?.toFixed(2) || 'N/A'}</div>
                <div class="score-label-text">Risk Score</div>
              </div>

              <div class="demographics-card">
                <div class="demo-grid">
                  <div class="demo-item">
                    <div class="demo-label">Median Age</div>
                    <div class="demo-value">${Math.round(medianAge)}</div>
                  </div>
                  <div class="demo-item">
                    <div class="demo-label">Employee Age</div>
                    <div class="demo-value">${Math.round(employeeAge)}</div>
                  </div>
                  <div class="demo-item">
                    <div class="demo-label">Family Size</div>
                    <div class="demo-value">${avgFamilySize.toFixed(2)}</div>
                  </div>
                  <div class="demo-item">
                    <div class="demo-label">Male</div>
                    <div class="demo-value">${maleCount}</div>
                  </div>
                  <div class="demo-item">
                    <div class="demo-label">Female</div>
                    <div class="demo-value">${femaleCount}</div>
                  </div>
                  <div class="demo-item">
                    <div class="demo-label">Group Size</div>
                    <div class="demo-value" style="font-size: 16px;">${groupCategory}</div>
                  </div>
                </div>
              </div>
            </div>

            ${chars.riskSegments ? `
              <div class="risk-segments">
                <div class="segments-title">Member Risk Distribution</div>
                <div class="segment-row">
                  <span class="segment-label low-risk">● Low Risk (&lt;0.85)</span>
                  <span class="segment-value low-risk">${chars.riskSegments.lowRisk} (${chars.riskSegments.lowRiskPct}%)</span>
                </div>
                <div class="segment-row">
                  <span class="segment-label avg-risk">● Average Risk (0.85-1.15)</span>
                  <span class="segment-value avg-risk">${chars.riskSegments.avgRisk} (${chars.riskSegments.avgRiskPct}%)</span>
                </div>
                <div class="segment-row">
                  <span class="segment-label high-risk">● High Risk (&gt;1.15)</span>
                  <span class="segment-value high-risk">${chars.riskSegments.highRisk} (${chars.riskSegments.highRiskPct}%)</span>
                </div>
              </div>
            ` : ''}

            <div class="footer">
              <div>© ${new Date().getFullYear()} Kennion Benefit Advisors · Level-Funded Health Plans</div>
              <div class="contact-info">Hunter Shepherd · 205-641-0469</div>
            </div>
          </body>
        </html>
      `);
      win.document.close();
      win.print();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <ReportNav />
      <div className="mx-auto max-w-5xl px-6 py-8" id="report-content">
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold mb-1" data-testid="text-report-title">{group.companyName}</h1>
            <p className="text-xs text-muted-foreground" data-testid="text-census-number">
              Census #KBA-{group.id.substring(0, 8).toUpperCase()} | Submitted {new Date(group.submittedAt).toLocaleDateString()}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} data-testid="button-download-report">
            <FileDown className="mr-1.5 h-3.5 w-3.5" /> Download Report
          </Button>
        </div>

        <Card className="p-4 mb-6">
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Risk Classification
          </h2>

          {group.riskScore != null ? (
            <div className="flex gap-2 max-w-2xl mx-auto">
              {(['preferred', 'standard', 'high'] as const).map((tier) => {
                const config = TIER_CONFIG[tier];
                const Icon = config.icon;
                const isActive = group.riskTier === tier;

                return (
                  <div
                    key={tier}
                    className={`flex-1 px-3 py-3 rounded-lg border-2 text-center transition-all ${
                      isActive
                        ? config.tabColor + ' font-bold'
                        : 'border-border bg-muted/20 text-muted-foreground/40'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1.5">
                      <Icon className="h-4 w-4" />
                      <span className="text-xs font-semibold">{config.label.replace(' Risk', '')}</span>
                      {isActive && (
                        <div className={`text-xl font-bold ${config.color}`}>
                          {group.riskScore.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Clock className="mx-auto h-6 w-6 mb-2" />
              <p className="text-sm">Analysis pending</p>
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="p-6">
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Census Details
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Employees</span>
                </div>
                <span className="text-lg font-bold" data-testid="text-report-ee">{group.employeeCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Spouses</span>
                </div>
                <span className="text-lg font-bold" data-testid="text-report-sp">{group.spouseCount || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Baby className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Dependents</span>
                </div>
                <span className="text-lg font-bold" data-testid="text-report-dep">{group.dependentCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total Lives</span>
                </div>
                <span className="text-lg font-bold" data-testid="text-report-total">{group.totalLives}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Group Demographics
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Median Age</span>
                <div className="text-right">
                  <div className="text-lg font-bold">{Math.round(medianAge)}</div>
                  <div className="text-xs text-muted-foreground">{medianAgeComp.text}</div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Employee Age</span>
                <div className="text-lg font-bold">{Math.round(employeeAge)}</div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Avg Family Size</span>
                <div className="text-right">
                  <div className="text-lg font-bold">{avgFamilySize.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">{familySizeComp.text}</div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Group Category</span>
                <Badge variant="secondary" className="font-semibold text-sm">{groupCategory}</Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Dependency Ratio</span>
                <div className="text-lg font-bold">{dependencyRatio.toFixed(2)}</div>
              </div>

              <div className="pt-3 border-t">
                <div className="text-xs text-muted-foreground mb-2">Gender Mix</div>
                <GenderChart male={maleCount} female={femaleCount} />
              </div>
            </div>
          </Card>
        </div>

        {(group.riskTier === 'preferred' || group.riskTier === 'standard') && (
          <Card className="p-4 mb-6 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-green-900 dark:text-green-100 mb-1">Qualifies for Kennion Program</h3>
                <p className="text-sm text-green-800 dark:text-green-200">
                  Groups like yours save an average of <strong>18% vs traditional market rates</strong>.
                </p>
              </div>
            </div>
          </Card>
        )}

        {group.riskTier === 'high' && (
          <Card className="p-4 mb-6 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">Alternative Options Available</h3>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  We focus on Preferred and Standard risk groups. We can discuss fully-insured options for your situation.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
