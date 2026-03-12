import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Upload,
  FileSpreadsheet,
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  LogOut,
  Loader2,
  Download,
  Users,
  Building2,
  Activity,
  TrendingUp,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  Edit2,
  FileDown,
  UserCheck,
  Heart,
  Baby,
  Trash2,
  FileText,
  Shield,
  Brain,
  Sparkles,
} from "lucide-react";
import { KennionLogo } from "@/components/kennion-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Group } from "@shared/schema";

const TIER_CONFIG: Record<string, { label: string; color: string }> = {
  preferred: { label: "Preferred Risk", color: "text-green-600 dark:text-green-400" },
  standard: { label: "Standard Risk", color: "text-yellow-600 dark:text-yellow-400" },
  high: { label: "High Risk", color: "text-red-600 dark:text-red-400" },
};

function DashboardNav() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
        <KennionLogo size="md" />
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-sm text-muted-foreground">{user?.fullName}</span>
          <ThemeToggle />
          <Button size="icon" variant="ghost" onClick={handleLogout} data-testid="button-logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </nav>
  );
}

function SimpleHeader({ hasGroups }: { hasGroups: boolean }) {
  if (hasGroups) return null;

  return (
    <Card className="p-6 mb-6 bg-primary/5 border-primary/20">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 flex-shrink-0">
          <Upload className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-xl mb-3">Get Your Benefits Quote</h2>
          <div className="space-y-2 text-sm">
            <p className="font-medium text-foreground">
              Here's what to do:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Upload your employee census (CSV file) below</li>
              <li>We'll instantly analyze your group and provide a risk score</li>
              <li>Hunter Shepherd will contact you with a customized benefits proposal</li>
            </ol>
            <div className="mt-4 pt-4 border-t">
              <p className="font-medium text-foreground mb-1">Need Help?</p>
              <p className="text-muted-foreground">
                Text or call Hunter Shepherd: <a href="tel:+12056410469" className="font-semibold text-primary hover:underline">205-641-0469</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

const ANALYSIS_MESSAGES = [
  { text: "Parsing census data...", pct: 5 },
  { text: "Validating employee records...", pct: 12 },
  { text: "Analyzing age distribution...", pct: 20 },
  { text: "Evaluating demographic risk factors...", pct: 28 },
  { text: "Computing gender ratio impact...", pct: 35 },
  { text: "Assessing group size factor...", pct: 42 },
  { text: "Running actuarial models...", pct: 50 },
  { text: "Calculating dependency ratios...", pct: 58 },
  { text: "Cross-referencing regional data...", pct: 65 },
  { text: "Applying underwriting criteria...", pct: 72 },
  { text: "Generating risk profile...", pct: 80 },
  { text: "Determining qualification tier...", pct: 88 },
  { text: "Finalizing Kennion Score...", pct: 95 },
  { text: "Analysis complete!", pct: 100 },
];

function AnalysisAnimation({ onComplete, group }: { onComplete: () => void; group: Group | null }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const totalDuration = 60000;
    const intervalTime = totalDuration / ANALYSIS_MESSAGES.length;
    let idx = 0;

    const smoothInterval = setInterval(() => {
      idx++;
      if (idx >= ANALYSIS_MESSAGES.length) {
        clearInterval(smoothInterval);
        setTimeout(onComplete, 800);
        return;
      }
      setMessageIndex(idx);
      setProgress(ANALYSIS_MESSAGES[idx].pct);
    }, intervalTime);

    const progressSmooth = setInterval(() => {
      setProgress(prev => {
        const target = ANALYSIS_MESSAGES[idx]?.pct || 100;
        if (prev < target) return Math.min(prev + 0.5, target);
        return prev;
      });
    }, 200);

    return () => {
      clearInterval(smoothInterval);
      clearInterval(progressSmooth);
    };
  }, [onComplete]);

  const currentMessage = ANALYSIS_MESSAGES[messageIndex];

  return (
    <Card className="p-8">
      <div className="text-center space-y-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto animate-pulse">
          <Brain className="h-8 w-8 text-primary" />
        </div>

        <div>
          <h2 className="text-xl font-bold tracking-tight" data-testid="text-analyzing-title">
            Analyzing Your Census
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Our AI underwriting engine is evaluating your group's risk profile
          </p>
        </div>

        <div className="max-w-md mx-auto space-y-3">
          <Progress value={progress} className="h-3" data-testid="progress-analysis" />
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
              <span className="text-muted-foreground font-medium" data-testid="text-analysis-status">
                {currentMessage.text}
              </span>
            </div>
            <span className="font-mono text-muted-foreground">{Math.round(progress)}%</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto pt-4">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Records</div>
            <div className="text-lg font-bold">{group?.totalLives || "..."}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Employees</div>
            <div className="text-lg font-bold">{group?.employeeCount || "..."}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Variables</div>
            <div className="text-lg font-bold">50+</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

interface CleanedRow {
  firstName: string;
  lastName: string;
  relationship: string;
  dob: string;
  gender: string;
  zip: string;
  issues?: string[];
}

interface ParseResult {
  totalRows: number;
  cleanedRows: number;
  previewRows: CleanedRow[];
  summary: string;
  warnings: string[];
  confidence: "high" | "medium" | "low";
}

function CensusUploadWizard({ onComplete }: { onComplete: (group: Group) => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState<"upload" | "confirm">("upload");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast({ title: "Invalid file", description: "Please upload a CSV file.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/groups/parse", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Parse failed");
      }

      const result: ParseResult = await res.json();
      setParseResult(result);
      setStep("confirm");
      toast({
        title: "AI Processing Complete",
        description: result.summary,
      });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  }, [toast]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      const res = await apiRequest("POST", "/api/groups/confirm", {});
      const data = await res.json();
      toast({ title: "Census uploaded", description: "Starting risk analysis..." });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      onComplete(data.group);
    } catch (err: any) {
      const msg = err.message || "Upload failed";
      if (msg.includes("pending") || msg.includes("upload a file")) {
        toast({ title: "Session expired", description: "Please re-upload your CSV file.", variant: "destructive" });
        setStep("upload");
        setParseResult(null);
      } else {
        toast({ title: "Upload failed", description: msg, variant: "destructive" });
      }
    } finally {
      setIsConfirming(false);
    }
  };

  if (step === "upload") {
    return (
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h2 className="font-semibold text-lg" data-testid="text-upload-heading">Step 1: Upload Your Employee Census</h2>
            <p className="text-sm text-muted-foreground mt-1">
              This allows us to analyze your group and provide you with an accurate benefits quote.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href="/api/groups/template" download data-testid="button-download-template">
              <Download className="mr-1.5 h-3.5 w-3.5" /> CSV Template
            </a>
          </Button>
        </div>

        {isUploading ? (
          <div className="space-y-4 py-8">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm font-medium">Parsing your file...</span>
            </div>
          </div>
        ) : (
          <div
            className="relative rounded-md border-2 border-dashed p-8 text-center transition-colors hover-elevate"
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={onDrop}
            data-testid="drop-zone-csv"
          >
            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">Drag & drop your CSV file here</p>
            <p className="mt-1 text-xs text-muted-foreground">or click to browse</p>
            <input
              type="file"
              accept=".csv"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={onFileSelect}
              data-testid="input-file-csv"
            />
          </div>
        )}

        <div className="mt-4 rounded-md bg-card p-3 border">
          <p className="text-xs font-medium mb-2">Required CSV Columns:</p>
          <div className="flex flex-wrap gap-1.5">
            {["First Name", "Last Name", "Type (EE/SP/DEP)", "Date of Birth", "Gender", "Zip Code"].map((col) => (
              <Badge key={col} variant="secondary" className="text-xs">{col}</Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            AI will automatically detect and standardize your data (M→Male, EE→Employee, etc.)
          </p>
        </div>
      </Card>
    );
  }

  if (step === "confirm" && parseResult) {
    const hasWarnings = parseResult.warnings.length > 0;
    const rowsWithIssues = parseResult.previewRows.filter(r => r.issues && r.issues.length > 0);

    return (
      <Card className="p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="icon" onClick={() => setStep("upload")} data-testid="button-back-upload">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="font-semibold text-lg">✓ AI Cleaned Your Data</h2>
          </div>
          <p className="text-sm text-muted-foreground ml-10">{parseResult.summary}</p>
        </div>

        <div className="mb-4 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-700 dark:text-green-400">
              {parseResult.cleanedRows} rows processed successfully
            </span>
          </div>
        </div>

        {hasWarnings && (
          <div className="mb-4 rounded-md bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="flex-1">
                <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400 block mb-1">
                  Data Quality Warnings
                </span>
                <ul className="text-xs text-yellow-600/80 dark:text-yellow-400/80 space-y-0.5">
                  {parseResult.warnings.slice(0, 5).map((w, i) => (
                    <li key={i}>• {w}</li>
                  ))}
                  {parseResult.warnings.length > 5 && (
                    <li className="italic">...and {parseResult.warnings.length - 5} more</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 rounded-md border">
          <div className="p-3 border-b bg-muted/30">
            <h3 className="text-sm font-medium">Preview (first 10 rows)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="text-left py-2 px-3 font-medium">First</th>
                  <th className="text-left py-2 px-3 font-medium">Last</th>
                  <th className="text-left py-2 px-3 font-medium">Type</th>
                  <th className="text-left py-2 px-3 font-medium">DOB</th>
                  <th className="text-left py-2 px-3 font-medium">Gender</th>
                  <th className="text-left py-2 px-3 font-medium">Zip</th>
                </tr>
              </thead>
              <tbody>
                {parseResult.previewRows.map((row, i) => (
                  <tr key={i} className={`border-b ${row.issues ? 'bg-yellow-50/50 dark:bg-yellow-950/10' : ''}`}>
                    <td className="py-2 px-3">{row.firstName || <span className="text-muted-foreground">—</span>}</td>
                    <td className="py-2 px-3">{row.lastName || <span className="text-muted-foreground">—</span>}</td>
                    <td className="py-2 px-3">
                      <Badge variant="outline" className="text-xs">{row.relationship}</Badge>
                    </td>
                    <td className="py-2 px-3">{row.dob || <span className="text-muted-foreground">—</span>}</td>
                    <td className="py-2 px-3">{row.gender}</td>
                    <td className="py-2 px-3">{row.zip || <span className="text-muted-foreground">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <Button
          onClick={handleConfirm}
          disabled={isConfirming}
          className="w-full"
          size="lg"
          data-testid="button-confirm-mapping"
        >
          {isConfirming ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing Census...
            </>
          ) : (
            <>
              Looks Good - Submit & Get Risk Analysis <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </Card>
    );
  }

  return null;
}

function GroupCard({ group, index, onClick, onDelete }: { group: Group; index: number; onClick: () => void; onDelete: () => void }) {
  const tier = group.riskTier ? TIER_CONFIG[group.riskTier] || { label: group.riskTier, color: "text-muted-foreground" } : null;
  const censusNumber = `KBA-${group.id.substring(0, 8).toUpperCase()}`;
  const isQualified = group.riskTier === "preferred" || group.riskTier === "standard";

  return (
    <Card
      className="p-6 hover-elevate transition-colors"
      data-testid={`card-group-${group.id}`}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 cursor-pointer" onClick={onClick}>
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 dark:bg-primary/20">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold" data-testid="text-group-company">{group.companyName}</h3>
            <p className="text-xs text-muted-foreground" data-testid="text-census-number">
              Census #{censusNumber}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isQualified && (
            <Badge variant="secondary" className="text-xs text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Qualified
            </Badge>
          )}
          {group.riskTier === "high" && (
            <Badge variant="secondary" className="text-xs text-red-600 dark:text-red-400">
              <XCircle className="h-3 w-3 mr-1" /> High Risk
            </Badge>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" data-testid={`button-delete-${group.id}`} onClick={(e) => e.stopPropagation()}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Census</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete census #{censusNumber}? This will permanently remove the census data and risk analysis. You can re-upload a new census afterwards.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} data-testid="button-confirm-delete">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-4 cursor-pointer" onClick={onClick}>
        <div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <UserCheck className="h-3 w-3" /> Employees
          </div>
          <div className="text-lg font-semibold" data-testid="text-employee-count">{group.employeeCount}</div>
        </div>
        <div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Heart className="h-3 w-3" /> Spouses
          </div>
          <div className="text-lg font-semibold" data-testid="text-spouse-count">{group.spouseCount || 0}</div>
        </div>
        <div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Baby className="h-3 w-3" /> Dependents
          </div>
          <div className="text-lg font-semibold" data-testid="text-dependent-count">{group.dependentCount}</div>
        </div>
        <div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" /> Total Lives
          </div>
          <div className="text-lg font-semibold" data-testid="text-total-lives">{group.totalLives}</div>
        </div>
      </div>

      {group.riskScore != null && (
        <div className="mt-4 pt-4 border-t cursor-pointer" onClick={onClick}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div>
                <div className="text-xs text-muted-foreground">Kennion Score</div>
                <div className="text-xl font-bold text-primary" data-testid="text-risk-score">
                  {group.riskScore.toFixed(2)}
                </div>
              </div>
              {tier && (
                <Badge variant="outline" className={`text-xs ${tier.color}`} data-testid="text-risk-tier">
                  {tier.label}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" data-testid={`button-view-report-${group.id}`}>
                View Report <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {isQualified && (
            <div className="mt-3 rounded-md border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-3">
              <div className="flex items-start gap-3">
                <Shield className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    ✓ Qualified for Benefits Program
                  </p>
                  <p className="text-xs text-green-600/80 dark:text-green-400/80 mt-1">
                    Hunter Shepherd will contact you with a customized proposal
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function GroupsList() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: groups, isLoading } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

  const handleDelete = async (groupId: string) => {
    try {
      await apiRequest("DELETE", `/api/groups/${groupId}`);
      toast({ title: "Census deleted", description: "You can upload a new census at any time." });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-md" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!groups || groups.length === 0) {
    return (
      <Card className="p-8 text-center">
        <FileSpreadsheet className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="font-semibold">No submissions yet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Upload your employee census above to get started.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Your Census Submissions</h2>
        <Badge variant="secondary">{groups.length} submission{groups.length !== 1 ? "s" : ""}</Badge>
      </div>
      {groups.map((g, i) => (
        <GroupCard
          key={g.id}
          group={g}
          index={i}
          onClick={() => navigate(`/report/${g.id}`)}
          onDelete={() => handleDelete(g.id)}
        />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analyzingGroup, setAnalyzingGroup] = useState<Group | null>(null);

  const { data: groups } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

  const hasGroups = Boolean(groups && groups.length > 0);

  const firstName = user?.fullName?.split(" ")[0] || "there";

  const handleUploadComplete = (group: Group) => {
    setAnalyzingGroup(group);
    setShowAnalysis(true);
  };

  const handleAnalysisComplete = () => {
    setShowAnalysis(false);
    setAnalyzingGroup(null);
    queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-2">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-welcome-message">
            Welcome, {firstName}!
          </h1>
          {user?.companyName && (
            <p className="text-lg font-semibold text-primary mt-1">{user.companyName}</p>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            Benefits Qualification Portal
          </p>
        </div>

        <SimpleHeader hasGroups={hasGroups} />

        {showAnalysis ? (
          <AnalysisAnimation onComplete={handleAnalysisComplete} group={analyzingGroup} />
        ) : (
          <div className="space-y-6">
            <CensusUploadWizard onComplete={handleUploadComplete} />
            <GroupsList />
          </div>
        )}
      </div>
    </div>
  );
}
