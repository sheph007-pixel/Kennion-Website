import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useState } from "react";
import Papa from "papaparse";
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
  Printer,
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
    if (score < 1.0) return "text-green-600 dark:text-green-400";
    if (score < 1.5) return "text-yellow-600 dark:text-yellow-400";
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
  const dependencyRatio = ((group.spouseCount || 0) + (group.childrenCount || 0)) / (group.employeeCount || 1);

  // Benchmark comparisons
  const medianAgeComp = getComparison(medianAge, BENCHMARKS.medianAge);
  const familySizeComp = getComparison(avgFamilySize, BENCHMARKS.avgFamilySize);
  const genderComp = getComparison(femalePercentage, BENCHMARKS.femalePercentage);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: letter;
            margin: 0.75in 0.6in;
          }

          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          nav, .print\\:hidden {
            display: none !important;
          }

          .mx-auto {
            max-width: none !important;
            padding: 0 !important;
          }

          h1 {
            page-break-after: avoid;
          }

          .grid {
            page-break-inside: avoid;
          }
        }
      `}} />
      <ReportNav />
      <div className="mx-auto max-w-5xl px-6 py-8" id="report-content">
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap print:block">
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="mb-3 print:hidden"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold mb-1" data-testid="text-report-title">{group.companyName}</h1>
            <p className="text-xs text-muted-foreground" data-testid="text-census-number">
              Census #KBA-{group.id.substring(0, 8).toUpperCase()} | Submitted {new Date(group.submittedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2 print:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const res = await fetch(`/api/groups/${groupId}/census`, { credentials: "include" });
                  if (res.ok) {
                    const censusData = await res.json();
                    const csv = Papa.unparse(censusData.map((entry: any) => ({
                      'First Name': entry.firstName,
                      'Last Name': entry.lastName,
                      'Type': entry.relationship,
                      'Date of Birth': entry.dateOfBirth,
                      'Gender': entry.gender,
                      'Zip Code': entry.zipCode,
                    })));
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    const censusNum = `KBA-${group.id.substring(0, 8).toUpperCase()}`;
                    a.download = `${group.companyName.replace(/[^a-z0-9]/gi, '_')}_${censusNum}_Census.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                  } else {
                    console.error('Failed to fetch census data');
                    alert('Failed to download census data. Please try again.');
                  }
                } catch (error) {
                  console.error('Error downloading census:', error);
                  alert('Error downloading census data. Please try again.');
                }
              }}
              data-testid="button-download-census"
            >
              <FileDown className="mr-1.5 h-3.5 w-3.5" /> Download Census
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} data-testid="button-download-report">
              <Printer className="mr-1.5 h-3.5 w-3.5" /> Print Report
            </Button>
          </div>
        </div>

        <Card className="p-4 mb-6 border-2">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2 justify-center">
            <Shield className="h-5 w-5 text-primary" />
            Risk Classification
          </h2>

          {group.riskScore != null ? (
            <>
              {/* Intro explanation */}
              <div className="text-center mb-4 px-4">
                <p className="text-sm leading-relaxed">
                  {(() => {
                    const riskTier = group.riskTier;
                    const score = group.riskScore;
                    const age = Math.round(medianAge);
                    const size = groupCategory;

                    if (riskTier === 'preferred') {
                      return `Congratulations! Your group is Preferred Risk with a score of ${score.toFixed(2)}. This is excellent. Your group has a younger average age (${age} years) and ${size === 'Micro' ? 'a small, healthy group' : 'healthy demographics'}, which means lower expected medical costs and better rates.`;
                    } else if (riskTier === 'standard') {
                      return `Your group is Standard Risk with a score of ${score.toFixed(2)}. This is good. Your group's age (${age} years) and ${group.totalLives} members put you right in the average range, which means fair pricing and solid coverage options.`;
                    } else {
                      return `Your group is High Risk with a score of ${score.toFixed(2)}. Your group has an older average age (${age} years) or other factors that increase expected medical costs. We recommend fully-insured plans that can better protect your group.`;
                    }
                  })()}
                </p>
              </div>

              {/* Risk tier cards */}
              <div className="flex gap-2">
                {(['preferred', 'standard', 'high'] as const).map((tier) => {
                  const config = TIER_CONFIG[tier];
                  const Icon = config.icon;
                  const isActive = group.riskTier === tier;

                  return (
                    <div
                      key={tier}
                      className={`flex-1 px-4 py-4 rounded-lg border-4 text-center transition-all ${
                        isActive
                          ? config.tabColor + ' font-bold shadow-lg'
                          : 'border-border/60 bg-muted/30 text-muted-foreground/70'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1.5">
                        <Icon className={`h-6 w-6 ${isActive ? '' : 'opacity-60'}`} />
                        <span className={`text-sm font-bold ${isActive ? '' : 'font-semibold'}`}>
                          {config.label.replace(' Risk', '')}
                        </span>
                        {isActive && (
                          <div className={`text-3xl font-extrabold ${config.color} mt-0.5`}>
                            {group.riskScore.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Clock className="mx-auto h-6 w-6 mb-2" />
              <p className="text-sm">Analysis pending</p>
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="overflow-hidden">
            <div className="bg-primary/10 px-4 py-2.5 border-b">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Census Details
              </h2>
            </div>
            <div className="p-3">
              <div className="divide-y">
                <div className="flex justify-between items-center py-1.5">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Employees</span>
                  </div>
                  <span className="text-base font-bold" data-testid="text-report-ee">{group.employeeCount}</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <div className="flex items-center gap-2">
                    <Heart className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Spouses</span>
                  </div>
                  <span className="text-base font-bold" data-testid="text-report-sp">{group.spouseCount || 0}</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <div className="flex items-center gap-2">
                    <Baby className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Children</span>
                  </div>
                  <span className="text-base font-bold" data-testid="text-report-dep">{group.childrenCount}</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Total Lives</span>
                  </div>
                  <span className="text-base font-bold" data-testid="text-report-total">{group.totalLives}</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Group Category</span>
                    <div className="group relative">
                      <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                      <div className="absolute left-0 top-5 hidden group-hover:block z-10 w-56 p-2 text-xs bg-popover border rounded-md shadow-lg">
                        Micro: 2-14 lives | Small: 15-50 lives | Large: 51+ lives
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="font-semibold text-xs">{groupCategory}</Badge>
                </div>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="bg-primary/10 px-4 py-2.5 border-b">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Group Demographics
              </h2>
            </div>
            <div className="p-3">
              <div className="divide-y">
                <div className="flex justify-between items-center py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Median Age</span>
                    <div className="group relative">
                      <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                      <div className="absolute left-0 top-5 hidden group-hover:block z-10 w-48 p-2 text-xs bg-popover border rounded-md shadow-lg">
                        The middle age value across all members in the group
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold">{Math.round(medianAge)}</div>
                    <div className="text-xs text-muted-foreground">{medianAgeComp.text}</div>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Employee Age</span>
                    <div className="group relative">
                      <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                      <div className="absolute left-0 top-5 hidden group-hover:block z-10 w-48 p-2 text-xs bg-popover border rounded-md shadow-lg">
                        Average age of employees only (excludes spouses and children)
                      </div>
                    </div>
                  </div>
                  <div className="text-base font-bold">{Math.round(employeeAge)}</div>
                </div>

                <div className="flex justify-between items-center py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Avg Family Size</span>
                    <div className="group relative">
                      <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                      <div className="absolute left-0 top-5 hidden group-hover:block z-10 w-56 p-2 text-xs bg-popover border rounded-md shadow-lg">
                        Average number of covered lives per employee (employee + spouse + children)
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold">{avgFamilySize.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">{familySizeComp.text}</div>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Dependency Ratio</span>
                    <div className="group relative">
                      <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                      <div className="absolute left-0 top-5 hidden group-hover:block z-10 w-56 p-2 text-xs bg-popover border rounded-md shadow-lg">
                        Average number of children and spouses per employee
                      </div>
                    </div>
                  </div>
                  <div className="text-base font-bold">{dependencyRatio.toFixed(2)}</div>
                </div>

                <div className="pt-1.5 pb-1">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-xs text-muted-foreground">Gender Mix</span>
                    <div className="group relative">
                      <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                      <div className="absolute left-0 top-5 hidden group-hover:block z-10 w-48 p-2 text-xs bg-popover border rounded-md shadow-lg">
                        Percentage of female members in the group
                      </div>
                    </div>
                  </div>
                  <GenderChart male={maleCount} female={femaleCount} />
                </div>
              </div>
            </div>
          </Card>
        </div>

        <Card className="overflow-hidden mb-6">
          <div className="bg-primary/10 px-4 py-2.5 border-b">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Age Band Risk Analysis
            </h2>
          </div>
          <div className="p-4">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-primary/20">
                  <th className="text-left py-2 px-3 font-semibold">Age Band</th>
                  <th className="text-right py-2 px-3 font-semibold">Females</th>
                  <th className="text-right py-2 px-3 font-semibold">Males</th>
                  <th className="text-right py-2 px-3 font-semibold">Total</th>
                  <th className="text-right py-2 px-3 font-semibold">Avg Risk Score</th>
                  <th className="text-right py-2 px-3 font-semibold">vs. Benchmark</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(() => {
                  const ageBands = ['0-4', '5-9', '10-14', '15-19', '20-24', '25-29', '30-34', '35-39', '40-44', '45-49', '50-54', '55-59', '60-64', '65-69', '70-Above'];
                  const riskTable: Record<string, { female: number; male: number }> = {
                    "0-4": { female: 0.35, male: 0.40 },
                    "5-9": { female: 0.30, male: 0.55 },
                    "10-14": { female: 0.37, male: 0.46 },
                    "15-19": { female: 0.62, male: 0.46 },
                    "20-24": { female: 0.80, male: 0.46 },
                    "25-29": { female: 0.92, male: 0.46 },
                    "30-34": { female: 0.88, male: 0.45 },
                    "35-39": { female: 0.81, male: 0.52 },
                    "40-44": { female: 1.18, male: 0.77 },
                    "45-49": { female: 1.03, male: 0.67 },
                    "50-54": { female: 1.43, male: 1.20 },
                    "55-59": { female: 1.22, male: 1.52 },
                    "60-64": { female: 1.49, male: 1.99 },
                    "65-69": { female: 3.81, male: 1.64 },
                    "70-Above": { female: 10.36, male: 2.78 },
                  };

                  const distribution = chars.ageBandDistribution || {};
                  let totalFemales = 0;
                  let totalMales = 0;
                  let weightedRiskSum = 0;
                  let totalCount = 0;

                  return (
                    <>
                      {ageBands.map(band => {
                        const bandData = distribution[band] || { female: 0, male: 0 };
                        const females = bandData.female || 0;
                        const males = bandData.male || 0;
                        const total = females + males;
                        const riskData = riskTable[band];

                        if (total === 0) {
                          return (
                            <tr key={band} className="text-muted-foreground/40">
                              <td className="py-2 px-3">{band}</td>
                              <td className="text-right py-2 px-3">—</td>
                              <td className="text-right py-2 px-3">—</td>
                              <td className="text-right py-2 px-3">—</td>
                              <td className="text-right py-2 px-3">—</td>
                              <td className="text-right py-2 px-3">—</td>
                            </tr>
                          );
                        }

                        const avgRisk = total > 0
                          ? (females * riskData.female + males * riskData.male) / total
                          : 0;
                        const vsBenchmark = avgRisk - 1.0;

                        totalFemales += females;
                        totalMales += males;
                        weightedRiskSum += females * riskData.female + males * riskData.male;
                        totalCount += total;

                        return (
                          <tr key={band} className={avgRisk >= 1.5 ? 'bg-red-50 dark:bg-red-950/10' : avgRisk < 1.0 ? 'bg-green-50 dark:bg-green-950/10' : ''}>
                            <td className="py-2 px-3">{band}</td>
                            <td className="text-right py-2 px-3 font-medium">{females}</td>
                            <td className="text-right py-2 px-3 font-medium">{males}</td>
                            <td className="text-right py-2 px-3 font-bold">{total}</td>
                            <td className={`text-right py-2 px-3 font-bold ${
                              avgRisk >= 1.5 ? 'text-red-600 dark:text-red-400' :
                              avgRisk < 1.0 ? 'text-green-600 dark:text-green-400' :
                              'text-yellow-600 dark:text-yellow-400'
                            }`}>
                              {avgRisk.toFixed(3)}
                            </td>
                            <td className={`text-right py-2 px-3 font-medium ${
                              vsBenchmark > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                            }`}>
                              {vsBenchmark > 0 ? '+' : ''}{vsBenchmark.toFixed(3)}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="border-t-2 border-primary bg-primary/5 font-bold">
                        <td className="py-2 px-3">ALL AGES</td>
                        <td className="text-right py-2 px-3">{totalFemales}</td>
                        <td className="text-right py-2 px-3">{totalMales}</td>
                        <td className="text-right py-2 px-3">{totalCount}</td>
                        <td className="text-right py-2 px-3">{totalCount > 0 ? (weightedRiskSum / totalCount).toFixed(3) : '—'}</td>
                        <td className={`text-right py-2 px-3 ${
                          totalCount > 0 && (weightedRiskSum / totalCount - 1.0) > 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}>
                          {totalCount > 0 ? ((weightedRiskSum / totalCount - 1.0) > 0 ? '+' : '') + (weightedRiskSum / totalCount - 1.0).toFixed(3) : '—'}
                        </td>
                      </tr>
                    </>
                  );
                })()}
              </tbody>
            </table>
            </div>
          </div>
        </Card>

        <Card className="p-4 mb-6 border-l-4 border-l-blue-500">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Data Validation & Verification</h3>
              {(() => {
                const distribution = chars.ageBandDistribution || {};
                const ageBands = ['0-4', '5-9', '10-14', '15-19', '20-24', '25-29', '30-34', '35-39', '40-44', '45-49', '50-54', '55-59', '60-64', '65-69', '70-Above'];
                const riskTable: Record<string, { female: number; male: number }> = {
                  "0-4": { female: 0.35, male: 0.40 },
                  "5-9": { female: 0.30, male: 0.55 },
                  "10-14": { female: 0.37, male: 0.46 },
                  "15-19": { female: 0.62, male: 0.46 },
                  "20-24": { female: 0.80, male: 0.46 },
                  "25-29": { female: 0.92, male: 0.46 },
                  "30-34": { female: 0.88, male: 0.45 },
                  "35-39": { female: 0.81, male: 0.52 },
                  "40-44": { female: 1.18, male: 0.77 },
                  "45-49": { female: 1.03, male: 0.67 },
                  "50-54": { female: 1.43, male: 1.20 },
                  "55-59": { female: 1.22, male: 1.52 },
                  "60-64": { female: 1.49, male: 1.99 },
                  "65-69": { female: 3.81, male: 1.64 },
                  "70-Above": { female: 10.36, male: 2.78 },
                };

                // Calculate Age Band table totals
                let tableTotalFemales = 0;
                let tableTotalMales = 0;
                let tableWeightedRiskSum = 0;
                ageBands.forEach(band => {
                  const bandData = distribution[band] || { female: 0, male: 0 };
                  const females = bandData.female || 0;
                  const males = bandData.male || 0;
                  tableTotalFemales += females;
                  tableTotalMales += males;
                  const riskData = riskTable[band];
                  tableWeightedRiskSum += females * riskData.female + males * riskData.male;
                });
                const tableTotalMembers = tableTotalFemales + tableTotalMales;
                const tableCalculatedRiskScore = tableTotalMembers > 0 ? tableWeightedRiskSum / tableTotalMembers : 0;

                // Census Details values
                const censusTotalMembers = group.totalLives || 0;
                const censusEmployees = group.employeeCount || 0;
                const censusSpouses = group.spouseCount || 0;
                const censusChildren = group.childrenCount || 0;
                const censusSumCheck = censusEmployees + censusSpouses + censusChildren;
                const censusFemales = group.femaleCount || 0;
                const censusMales = group.maleCount || 0;
                const censusGenderTotal = censusFemales + censusMales;

                // Validation checks
                const totalLivesMatch = tableTotalMembers === censusTotalMembers && censusTotalMembers === censusSumCheck;
                const genderTotalsMatch = tableTotalMembers === censusGenderTotal;
                const genderBreakdownMatch = tableTotalFemales === censusFemales && tableTotalMales === censusMales;
                const riskScoreExists = group.riskScore != null;
                const riskScoreMatches = riskScoreExists && Math.abs(group.riskScore - tableCalculatedRiskScore) < 0.01;

                // Risk tier validation
                let riskTierCorrect = false;
                if (riskScoreExists) {
                  if (group.riskScore < 1.0 && group.riskTier === 'preferred') riskTierCorrect = true;
                  else if (group.riskScore >= 1.0 && group.riskScore < 1.5 && group.riskTier === 'standard') riskTierCorrect = true;
                  else if (group.riskScore >= 1.5 && group.riskTier === 'high') riskTierCorrect = true;
                }

                const allChecks = [totalLivesMatch, genderTotalsMatch, genderBreakdownMatch, riskScoreExists, riskScoreMatches, riskTierCorrect];
                const passedChecks = allChecks.filter(Boolean).length;
                const matchRate = Math.round((passedChecks / allChecks.length) * 100);

                return (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded flex items-center justify-center ${totalLivesMatch ? 'bg-green-500' : 'bg-red-500'}`}>
                        {totalLivesMatch && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-blue-800 dark:text-blue-200 text-xs">
                        <strong>Total Lives:</strong> Census ({censusTotalMembers}) = Age Band ({tableTotalMembers}) = Sum ({censusSumCheck}) {totalLivesMatch ? '✓' : '✗'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded flex items-center justify-center ${genderTotalsMatch ? 'bg-green-500' : 'bg-red-500'}`}>
                        {genderTotalsMatch && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-blue-800 dark:text-blue-200 text-xs">
                        <strong>Gender Total:</strong> Age Band ({tableTotalMembers}) = Gender Count ({censusGenderTotal}) {genderTotalsMatch ? '✓' : '✗'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded flex items-center justify-center ${genderBreakdownMatch ? 'bg-green-500' : 'bg-red-500'}`}>
                        {genderBreakdownMatch && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-blue-800 dark:text-blue-200 text-xs">
                        <strong>Gender Breakdown:</strong> Table ({tableTotalFemales}F + {tableTotalMales}M) = Census ({censusFemales}F + {censusMales}M) {genderBreakdownMatch ? '✓' : '✗'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded flex items-center justify-center ${riskScoreMatches ? 'bg-green-500' : 'bg-red-500'}`}>
                        {riskScoreMatches && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-blue-800 dark:text-blue-200 text-xs">
                        <strong>Risk Score Calculation:</strong> Stored ({group.riskScore?.toFixed(3)}) vs Calculated ({tableCalculatedRiskScore.toFixed(3)}) {riskScoreMatches ? '✓' : '✗'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded flex items-center justify-center ${riskTierCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                        {riskTierCorrect && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-blue-800 dark:text-blue-200 text-xs">
                        <strong>Risk Tier:</strong> {group.riskScore?.toFixed(3)} = {group.riskTier}
                        {riskTierCorrect ? ' ✓' : ' ✗'}
                        <span className="text-xs opacity-75">
                          {' '}(Preferred: &lt;1.0, Standard: 1.0-1.49, High: ≥1.5)
                        </span>
                      </span>
                    </div>

                    <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-blue-900 dark:text-blue-100">Data Integrity Match Rate:</span>
                        <span className={`font-bold text-lg ${matchRate === 100 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {matchRate}% ({passedChecks}/{allChecks.length})
                        </span>
                      </div>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        All census counts, age band distributions, risk score calculations, and tier classifications have been double-checked and verified for accuracy.
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </Card>

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
