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

function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { num: 1, label: "Upload Census", icon: Upload },
    { num: 2, label: "View Risk Score", icon: BarChart3 },
    { num: 3, label: "Review Proposal", icon: FileText },
  ];

  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((step, i) => {
        const StepIcon = step.icon;
        const isActive = currentStep === step.num;
        const isComplete = currentStep > step.num;

        return (
          <div key={step.num} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2 flex-1">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${
                isComplete ? "bg-primary text-primary-foreground" :
                isActive ? "bg-primary text-primary-foreground" :
                "bg-muted text-muted-foreground"
              }`}>
                {isComplete ? <Check className="h-4 w-4" /> : <span className="text-xs font-bold">{step.num}</span>}
              </div>
              <div className="hidden sm:block">
                <p className={`text-xs font-medium ${isActive || isComplete ? "text-foreground" : "text-muted-foreground"}`}>
                  Step {step.num}
                </p>
                <p className={`text-xs ${isActive || isComplete ? "text-muted-foreground" : "text-muted-foreground/60"}`}>
                  {step.label}
                </p>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px flex-1 mx-2 ${isComplete ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
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

interface ParseResult {
  headers: string[];
  totalRows: number;
  suggestedMappings: Record<string, string | null>;
  previewRows: Record<string, string>[];
  requiredFields: { key: string; label: string }[];
}

function CensusUploadWizard({ onComplete }: { onComplete: (group: Group) => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState<"upload" | "mapping" | "confirming">("upload");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [mappings, setMappings] = useState<Record<string, string | null>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);

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
      setMappings(result.suggestedMappings);
      setStep("mapping");
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

  const allMapped = parseResult?.requiredFields.every(f => mappings[f.key]) ?? false;

  const handleConfirm = async () => {
    if (!allMapped) {
      toast({ title: "Missing mappings", description: "Please map all required fields before continuing.", variant: "destructive" });
      return;
    }

    setIsConfirming(true);
    try {
      const res = await apiRequest("POST", "/api/groups/confirm", { mappings });
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
        setMappings({});
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
            <h2 className="font-semibold" data-testid="text-upload-heading">Upload Employee Census</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Submit your employee census data to begin the qualification process.
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
            EE = Employee, SP = Spouse, DEP = Dependent. We'll auto-detect your column headers.
          </p>
        </div>

        <div className="mt-4 rounded-md bg-card p-3 border">
          <p className="text-xs font-medium mb-2">Sample Data:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1 pr-3 font-medium text-muted-foreground">First Name</th>
                  <th className="text-left py-1 pr-3 font-medium text-muted-foreground">Last Name</th>
                  <th className="text-left py-1 pr-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left py-1 pr-3 font-medium text-muted-foreground">Date of Birth</th>
                  <th className="text-left py-1 pr-3 font-medium text-muted-foreground">Gender</th>
                  <th className="text-left py-1 font-medium text-muted-foreground">Zip Code</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50"><td className="py-1 pr-3">John</td><td className="py-1 pr-3">Smith</td><td className="py-1 pr-3">EE</td><td className="py-1 pr-3">1985-03-15</td><td className="py-1 pr-3">Male</td><td className="py-1">30301</td></tr>
                <tr className="border-b border-border/50"><td className="py-1 pr-3">Jane</td><td className="py-1 pr-3">Smith</td><td className="py-1 pr-3">SP</td><td className="py-1 pr-3">1987-08-22</td><td className="py-1 pr-3">Female</td><td className="py-1">30301</td></tr>
                <tr><td className="py-1 pr-3">Tommy</td><td className="py-1 pr-3">Smith</td><td className="py-1 pr-3">DEP</td><td className="py-1 pr-3">2015-01-10</td><td className="py-1 pr-3">Male</td><td className="py-1">30301</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    );
  }

  if (step === "mapping" && parseResult) {
    return (
      <Card className="p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="icon" onClick={() => setStep("upload")} data-testid="button-back-upload">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="font-semibold">Map Your Columns</h2>
          </div>
          <p className="text-sm text-muted-foreground ml-10">
            We found {parseResult.totalRows} rows. Verify the auto-matched columns below.
          </p>
        </div>

        <div className="flex items-center gap-4 mb-6 text-xs text-muted-foreground">
          <span className="font-medium">Column from your CSV</span>
          <ArrowRight className="h-3 w-3 flex-shrink-0" />
          <span className="font-medium">Match to Kennion field</span>
        </div>

        <div className="space-y-4">
          {parseResult.requiredFields.map((field) => {
            const mapped = mappings[field.key];
            const isEditing = editingField === field.key;
            const previewValues = mapped && parseResult.previewRows
              ? parseResult.previewRows.slice(0, 3).map(r => r[mapped] || "")
              : [];

            return (
              <div key={field.key} className="rounded-md border p-4">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="min-w-[140px]">
                    {mapped && !isEditing ? (
                      <div>
                        <Badge variant="secondary" className="text-xs mb-2">{mapped}</Badge>
                        <div className="space-y-0.5">
                          {previewValues.map((v, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="text-muted-foreground/60">{i + 1}</span>
                              <span>{v || "\u2014"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-xs">Not matched</Badge>
                    )}
                  </div>

                  <ArrowRight className="h-4 w-4 mt-1 flex-shrink-0 text-muted-foreground" />

                  <div className="flex-1 min-w-[180px]">
                    {isEditing ? (
                      <Select
                        value={mapped || ""}
                        onValueChange={(val) => {
                          setMappings({ ...mappings, [field.key]: val || null });
                          setEditingField(null);
                        }}
                      >
                        <SelectTrigger data-testid={`select-mapping-${field.key}`}>
                          <SelectValue placeholder="Choose column" />
                        </SelectTrigger>
                        <SelectContent>
                          {parseResult.headers.map((h) => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs font-medium">{field.label}</Badge>
                        {mapped ? (
                          <div className="flex items-center gap-1.5">
                            <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                            <span className="text-xs text-green-600 dark:text-green-400">
                              Auto-matched to <strong>{mapped}</strong>
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <X className="h-3.5 w-3.5 text-red-500" />
                            <span className="text-xs text-red-500">Not matched</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {!isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingField(field.key)}
                        data-testid={`button-edit-${field.key}`}
                      >
                        <Edit2 className="h-3 w-3 mr-1" /> Edit
                      </Button>
                    )}
                    {mapped && !isEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setMappings({ ...mappings, [field.key]: null })}
                        data-testid={`button-ignore-${field.key}`}
                      >
                        Ignore
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-between gap-2 flex-wrap">
          <div className="text-sm text-muted-foreground">
            {parseResult.requiredFields.filter(f => mappings[f.key]).length} / {parseResult.requiredFields.length} fields mapped
          </div>
          <Button
            onClick={handleConfirm}
            disabled={!allMapped || isConfirming}
            data-testid="button-confirm-mapping"
          >
            {isConfirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                Submit Census <ArrowRight className="ml-1.5 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
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
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-xs font-medium text-green-700 dark:text-green-400">
                  Your group qualifies for our exclusive benefits program. A proposal will be available for review soon.
                </span>
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

  const hasGroups = groups && groups.length > 0;
  const hasQualified = groups?.some(g => g.riskTier === "preferred" || g.riskTier === "standard");

  const currentStep = !hasGroups ? 1 : hasQualified ? 3 : 2;

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
          <p className="text-sm text-muted-foreground mt-1">
            {user?.companyName ? `${user.companyName} \u2022 ` : ""}Benefits Qualification Portal
          </p>
        </div>

        <StepIndicator currentStep={currentStep} />

        {showAnalysis ? (
          <AnalysisAnimation onComplete={handleAnalysisComplete} group={analyzingGroup} />
        ) : (
          <div className="space-y-6">
            <CensusUploadWizard onComplete={handleUploadComplete} />
            <GroupsList />

            {hasQualified && (
              <Card className="p-6 border-primary/30">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 dark:bg-primary/20 flex-shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold" data-testid="text-proposal-heading">Step 3: Review Your Proposal</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your group has qualified for our exclusive benefits program. Our team is preparing a customized proposal for you. You'll be notified by email when it's ready for review.
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Proposal preparation in progress</span>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
