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

        <Card className="p-6 mb-8 border-l-4 border-l-primary">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Executive Summary
          </h2>
          <div className="space-y-3 text-[15px] leading-relaxed">
            <p>
              Your group has been classified as <strong className={tierConfig?.color || ''}>{tierConfig?.label || 'Standard Risk'}</strong> based on our proprietary AI analysis. Here's what this means for you:
            </p>

            <p>
              Traditional commercial group health plans are expensive because they pool everyone together—healthy groups subsidize sick ones. This "one-size-fits-all" approach means you're likely overpaying for coverage that doesn't reflect your group's actual health profile.
            </p>

            <p>
              Kennion takes a smarter approach. We use advanced AI technology to analyze your group's health risk with unprecedented accuracy. Because we can see that your group is <strong>{tierConfig?.label || 'Standard Risk'}</strong>, we're able to offer you better plans and better rates than the traditional market.
            </p>

            {(group.riskTier === 'preferred' || group.riskTier === 'standard') && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="font-semibold text-green-900 dark:text-green-100 mb-2">
                  ✓ Your Group Qualifies for the Kennion Program
                </p>
                <p className="text-green-800 dark:text-green-200">
                  We only accept Preferred and Standard risk groups into our program. By carefully managing who we work with, we can deliver exceptional value. Groups like yours save an average of <strong>18% compared to traditional market rates</strong>, while getting better benefits and more personalized service.
                </p>
              </div>
            )}

            {group.riskTier === 'high' && (
              <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                  Program Eligibility
                </p>
                <p className="text-amber-800 dark:text-amber-200">
                  At this time, your group's risk profile falls into our High Risk category. We focus on Preferred and Standard risk groups to maintain our ability to offer better-than-market rates. However, we're happy to discuss fully-insured options that may work better for your situation.
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6 mb-8 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            The Kennion Advantage
          </h2>
          <div className="space-y-3 text-[15px] leading-relaxed">
            <p>
              <strong>Proprietary AI Technology:</strong> Kennion has developed cutting-edge artificial intelligence that analyzes your group's health risk with a level of transparency and accuracy that was never before possible. This isn't just automated data entry—our AI model examines age distributions, family structures, gender mix, and dozens of other factors to build a complete picture of your group's future healthcare needs.
            </p>

            <p>
              <strong>Tailored Solutions:</strong> Armed with this comprehensive understanding, Kennion and our team of expert advisors can design group health solutions specifically matched to your company's makeup. We deliver highly accurate quotes with the confidence that comes from truly understanding your risk profile.
            </p>

            <p>
              <strong>Better Benefits, Lower Costs:</strong> This is a win for your group. Because of our strong underwriting and carefully managed private program, you get better benefits at a lower cost. We're not playing guessing games with your rates—we know exactly what level of coverage your group needs and can price it accordingly.
            </p>

            <p className="text-sm text-muted-foreground mt-4 pt-4 border-t">
              The traditional health insurance market is unsustainable. Employers are tired of year-over-year increases that don't reflect their actual experience. Kennion offers a better way forward.
            </p>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Kennion Risk Score
            </h2>

            {group.riskScore != null ? (
              <div className="flex flex-col items-center">
                <ScoreGauge score={group.riskScore} label="Risk Score" />

                <div className="mt-6 w-full">
                  <div className="flex gap-2">
                    {(['preferred', 'standard', 'high'] as const).map((tier) => {
                      const config = TIER_CONFIG[tier];
                      const Icon = config.icon;
                      const isActive = group.riskTier === tier;

                      return (
                        <div
                          key={tier}
                          className={`flex-1 px-3 py-2 rounded-md border-2 text-center transition-all ${
                            isActive
                              ? config.tabColor + ' font-semibold'
                              : 'border-border bg-background text-muted-foreground'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <Icon className="h-3.5 w-3.5" />
                            <span className="text-xs">{config.label.replace(' Risk', '')}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground text-center">
                    <div className="space-y-0.5">
                      <div>Preferred: &lt;1.0 | Standard: 1.0-1.5 | High: &gt;1.5</div>
                      <div className="text-[11px]">We accept Preferred and Standard risk groups</div>
                    </div>
                  </div>
                </div>
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

            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm text-muted-foreground">Median Age</span>
                    <div className="group relative">
                      <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                      <div className="absolute left-0 top-5 hidden group-hover:block z-10 w-48 p-2 text-xs bg-popover border rounded-md shadow-lg">
                        The middle age value across all members in the group
                      </div>
                    </div>
                  </div>
                  <div className="font-bold text-lg">{Math.round(medianAge)}</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {medianAgeComp.isAbove ? (
                      <TrendingUp className="h-3 w-3 text-red-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-green-500" />
                    )}
                    <span className="text-xs text-muted-foreground">{medianAgeComp.text}</span>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm text-muted-foreground">Employee Age</span>
                    <div className="group relative">
                      <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                      <div className="absolute left-0 top-5 hidden group-hover:block z-10 w-48 p-2 text-xs bg-popover border rounded-md shadow-lg">
                        Average age of employees only (excludes spouses and dependents)
                      </div>
                    </div>
                  </div>
                  <div className="font-bold text-lg">{Math.round(employeeAge)}</div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm text-muted-foreground">Avg Family Size</span>
                  <div className="group relative">
                    <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                    <div className="absolute left-0 top-5 hidden group-hover:block z-10 w-56 p-2 text-xs bg-popover border rounded-md shadow-lg">
                      Average number of covered lives per employee (employee + spouse + dependents)
                    </div>
                  </div>
                </div>
                <div className="font-bold text-lg">{avgFamilySize.toFixed(2)}</div>
                <div className="flex items-center gap-1.5 mt-1">
                  {familySizeComp.isAbove ? (
                    <TrendingUp className="h-3 w-3 text-orange-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-blue-500" />
                  )}
                  <span className="text-xs text-muted-foreground">{familySizeComp.text}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-sm text-muted-foreground">Gender Mix</span>
                  <div className="group relative">
                    <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                    <div className="absolute left-0 top-5 hidden group-hover:block z-10 w-48 p-2 text-xs bg-popover border rounded-md shadow-lg">
                      Percentage of female members in the group
                    </div>
                  </div>
                </div>
                <GenderChart male={maleCount} female={femaleCount} />
                <div className="flex items-center gap-1.5 mt-2">
                  {genderComp.isAbove ? (
                    <TrendingUp className="h-3 w-3 text-pink-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-blue-500" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {femalePercentage.toFixed(1)}% female ({genderComp.text})
                  </span>
                </div>
              </div>

              <div className="flex items-start justify-between gap-4 pt-2 border-t">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm text-muted-foreground">Group Category</span>
                    <div className="group relative">
                      <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                      <div className="absolute left-0 top-5 hidden group-hover:block z-10 w-56 p-2 text-xs bg-popover border rounded-md shadow-lg">
                        Micro: 2-14 lives | Small: 15-50 lives | Large: 51+ lives
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="font-semibold">{groupCategory}</Badge>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm text-muted-foreground">Dependency Ratio</span>
                    <div className="group relative">
                      <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                      <div className="absolute left-0 top-5 hidden group-hover:block z-10 w-56 p-2 text-xs bg-popover border rounded-md shadow-lg">
                        Average number of dependents and spouses per employee
                      </div>
                    </div>
                  </div>
                  <div className="font-bold text-lg">{dependencyRatio.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </Card>
        </div>

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
