import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import {
  Upload,
  FileSpreadsheet,
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
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
  Printer,
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
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="cursor-pointer" onClick={() => navigate("/dashboard")}>
            <KennionLogo size="md" />
          </div>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <span className="font-medium text-foreground">Dashboard</span>
          </div>
        </div>
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

function PrintInstructions() {
  return (
    <div className="hidden print:block p-12 max-w-3xl mx-auto bg-white text-black">
      {/* Logo */}
      <div className="mb-8">
        <KennionLogo size="lg" />
      </div>

      {/* From */}
      <div className="mb-8">
        <p className="text-2xl font-bold">Hunter Shepherd</p>
        <p className="text-lg text-gray-600">President, Kennion Benefit Advisors</p>
      </div>

      {/* Letter Content */}
      <div className="space-y-6 text-lg leading-relaxed">
        <p className="text-xl font-semibold">
          We can save your group a bunch of money on health insurance.
        </p>

        <p>
          To get started, I need your employee census. You will need each <span className="font-semibold">employee</span> and all <span className="font-semibold">family members</span> (i.e. spouses and children) that will be covered under the group health plan.
        </p>

        <div className="bg-gray-50 p-5 rounded-lg border-2 border-gray-200">
          <p className="font-semibold mb-3">What to include for each person:</p>
          <ul className="space-y-1 text-base">
            <li>• First Name & Last Name</li>
            <li>• Type (Employee, Spouse, or Child)</li>
            <li>• Date of Birth</li>
            <li>• Gender</li>
            <li>• Zip Code</li>
          </ul>
          <p className="text-sm text-gray-600 mt-3 italic">Don't worry about the format - our system automatically reads any CSV file!</p>
        </div>

        <p>
          Once I receive your list, we'll underwrite your group. We're looking for <span className="font-semibold">Preferred or Standard Risk</span> groups.
        </p>

        <p>
          Once approved, we'll send you an <span className="font-semibold">Employee Benefits proposal</span> with rates and coverage options.
        </p>

        <p className="text-xl font-semibold">
          Excited to help!
        </p>
      </div>

      {/* Contact Section */}
      <div className="mt-10 pt-8 border-t-2 border-gray-300 flex items-start justify-between">
        <div>
          <p className="text-lg font-semibold mb-2">Questions?</p>
          <p className="text-base">Call or Text:</p>
          <p className="text-3xl font-bold text-blue-600 mb-2">205-641-0469</p>
          <p className="text-base text-gray-600">hunter@kennion.com</p>
        </div>

        <div className="text-center">
          <p className="text-sm font-semibold mb-3">Access Online Portal:</p>
          <img
            src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=https://www.kennion.com"
            alt="QR Code to Kennion.com"
            className="border-4 border-gray-300 rounded mb-2"
          />
          <p className="text-lg font-bold">www.Kennion.com</p>
        </div>
      </div>

      <div className="mt-6 text-center text-sm text-gray-500">
        Group Health + Dental + Vision + Supplemental Benefits
      </div>
    </div>
  );
}

function SimpleHeader({ hasGroups, step }: { hasGroups: boolean; step: string }) {
  const handlePrint = () => {
    window.print();
  };

  if (hasGroups) return null;

  // Minimized version for non-upload steps
  if (step !== "upload") {
    return (
      <Card className="p-3 mb-4 bg-primary/5 border-primary/20">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Group Health + Dental + Vision + Supplemental Proposal</h3>
          <p className="text-xs text-muted-foreground">
            Questions? <a href="tel:+12056410469" className="font-semibold text-primary hover:underline">205-641-0469</a>
          </p>
        </div>
      </Card>
    );
  }

  // Full version for upload step
  return (
    <>
      <PrintInstructions />
      <Card className="p-5 mb-6 bg-primary/5 border-primary/20 print:hidden">
        <div className="space-y-3">
          <div>
            <h3 className="text-base font-semibold mb-2">Group Health + Dental + Vision + Supplemental</h3>
            <p className="text-sm text-muted-foreground mb-3">
              To calculate your rates, we need to know who you're covering. It takes about 2 minutes.
            </p>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-medium text-foreground">Here's how it works:</p>
            <ul className="space-y-1.5 text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <span className="text-primary font-semibold min-w-[1.25rem]">1.</span>
                <span>Upload your employee/family member list (names, birthdays, zip codes).</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-primary font-semibold min-w-[1.25rem]">2.</span>
                <span>We underwrite and approve your group.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-primary font-semibold min-w-[1.25rem]">3.</span>
                <span>We provide you with a benefits proposal.</span>
              </li>
            </ul>
          </div>
          <div className="pt-3 border-t">
            <p className="text-sm font-medium text-foreground">
              Questions? Text/Call Hunter Shepherd: <a href="tel:+12056410469" className="font-semibold text-primary hover:underline">205-641-0469</a>
            </p>
          </div>
        </div>
      </Card>
    </>
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

        <div className="grid grid-cols-4 gap-3 max-w-lg mx-auto pt-4">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Employees</div>
            <div className="text-lg font-bold">{group?.employeeCount || "..."}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Spouses</div>
            <div className="text-lg font-bold">{group?.spouseCount || "..."}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Children</div>
            <div className="text-lg font-bold">{group?.childrenCount || "..."}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="text-lg font-bold">{group?.totalLives || "..."}</div>
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

function formatDateToMMDDYY(dateStr: string): string {
  if (!dateStr) return "";

  // Handle YYYY-MM-DD format
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    const shortYear = year.slice(-2);
    return `${month}/${day}/${shortYear}`;
  }

  // Return as-is if already in different format
  return dateStr;
}

interface ValidationError {
  guidance: string;
  errors: string[];
  matchRate: number;
}

function WizardProgress({ step }: { step: "upload" | "map-columns" | "confirm" }) {
  const steps = [
    { id: "upload", label: "UPLOAD", number: 1 },
    { id: "map-columns", label: "MAP", number: 2 },
    { id: "confirm", label: "SUBMIT", number: 3 },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === step);

  return (
    <div className="flex gap-2 relative">
      {steps.map((s, idx) => {
        const isActive = idx === currentStepIndex;
        const isCompleted = idx < currentStepIndex;

        return (
          <div
            key={s.id}
            className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition-all ${
              isActive
                ? 'bg-white dark:bg-gray-900 text-black dark:text-white border-4 border-black dark:border-white border-b-0 rounded-t-lg relative z-10'
                : isCompleted
                ? 'bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-4 border-gray-400 dark:border-gray-600 rounded-lg mb-1'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-4 border-gray-200 dark:border-gray-700 rounded-lg mb-1'
            }`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              isActive
                ? 'bg-black dark:bg-white text-white dark:text-black'
                : isCompleted
                ? 'bg-gray-600 dark:bg-gray-400 text-white dark:text-black'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
            }`}>
              {s.number}
            </div>
            <span className="tracking-wide">{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function CensusUploadWizard({ onComplete, hasGroups }: { onComplete: (group: Group) => void; hasGroups: boolean }) {
  const { toast } = useToast();
  const [step, setStep] = useState<"upload" | "map-columns" | "confirm">("upload");
  const [parseResult, setParseResult] = useState<any | null>(null);
  const [originalParseResult, setOriginalParseResult] = useState<any | null>(null);
  const [cleanedResult, setCleanedResult] = useState<any | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isApplyingMapping, setIsApplyingMapping] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [validationError, setValidationError] = useState<ValidationError | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [mappingError, setMappingError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setUploadError("Invalid file type. Please upload a CSV file (.csv extension required).");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
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

      const result = await res.json();
      setParseResult(result);
      setOriginalParseResult(result);
      setColumnMapping(result.columnMapping || {});
      setStep("map-columns");
      toast({
        title: "Column Mapping Detected",
        description: result.message || "Please confirm the column mapping below.",
      });
    } catch (err: any) {
      setUploadError(err.message || "Failed to parse CSV file");
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

  const handleApplyMapping = async () => {
    setIsApplyingMapping(true);
    setMappingError(null);
    try {
      const res = await fetch("/api/groups/apply-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnMapping }),
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to apply mapping");
      }

      const result = await res.json();
      setCleanedResult(result);
      setParseResult(result);
      setStep("confirm");
      toast({
        title: "Data Cleaned Successfully",
        description: result.summary,
      });
    } catch (err: any) {
      setMappingError(err.message || "Failed to apply column mapping");
    } finally {
      setIsApplyingMapping(false);
    }
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    setValidationError(null);
    try {
      const res = await apiRequest("POST", "/api/groups/confirm", {});
      const data = await res.json();
      toast({ title: "Census uploaded", description: "Starting risk analysis..." });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      onComplete(data.group);
    } catch (err: any) {
      const msg = err.message || "Upload failed";

      // Check if this is a validation error
      if (err.guidance && err.errors && err.matchRate !== undefined) {
        setValidationError({
          guidance: err.guidance,
          errors: err.errors,
          matchRate: err.matchRate,
        });
        toast({
          title: "Validation Failed",
          description: `Data integrity: ${err.matchRate}%. Please review the errors below.`,
          variant: "destructive"
        });
      } else if (msg.includes("pending") || msg.includes("upload a file")) {
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
      <>
        <SimpleHeader hasGroups={hasGroups} step={step} />
        <WizardProgress step={step} />

        {/* Upload Error Dialog */}
        <AlertDialog open={!!uploadError} onOpenChange={(open) => !open && setUploadError(null)}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Upload Failed
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base pt-2">
                {uploadError}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setUploadError(null)}>
                Try Again
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Card className="p-6 border-4 border-black dark:border-white shadow-lg rounded-tl-none">
          <div className="mb-4">
            <h2 className="font-bold text-2xl text-primary" data-testid="text-upload-heading">Upload Your Employee Census</h2>
            <p className="text-sm text-muted-foreground mt-1">
              You will need each <span className="font-semibold text-foreground">employee</span> and all <span className="font-semibold text-foreground">family members</span> (i.e. spouses and children) that will be covered under the group health plan.
            </p>
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
            className="relative rounded-lg border-[3px] border-dashed border-primary/40 bg-primary/5 p-12 text-center transition-all hover:border-primary/60 hover:bg-primary/10 cursor-pointer"
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={onDrop}
            data-testid="drop-zone-csv"
          >
            <Upload className="mx-auto h-12 w-12 text-primary mb-4" />
            <p className="text-base font-semibold text-foreground">Drag & drop your CSV file here</p>
            <p className="mt-2 text-sm text-muted-foreground">or click anywhere to browse</p>
            <input
              type="file"
              accept=".csv"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={onFileSelect}
              data-testid="input-file-csv"
            />
          </div>
        )}

        <div className="mt-4 rounded-md bg-blue-50 dark:bg-blue-950/20 p-3 border-2 border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <div className="rounded-full bg-blue-500 text-white px-2 py-0.5 text-[10px] font-bold mt-0.5">AI</div>
            <div className="flex-1">
              <p className="text-xs font-semibold mb-2 text-blue-900 dark:text-blue-100">Just include these 6 fields (any column names work):</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {["First Name", "Last Name", "Type (EE/SP/CH)", "Date of Birth", "Gender", "Zip Code"].map((col) => (
                  <Badge key={col} variant="secondary" className="text-xs">{col}</Badge>
                ))}
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                ✨ AI detects columns and cleans data automatically
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Don't have a list? <a href="/api/groups/template" download className="text-primary hover:underline font-medium">Download example CSV</a>
              </p>
            </div>
          </div>
        </div>
      </Card>
      </>
    );
  }

  if (step === "map-columns" && parseResult) {
    const REQUIRED_FIELDS = ["First Name", "Last Name", "Type", "Date of Birth", "Gender", "Zip Code"];
    const FIELD_LABELS: Record<string, string> = {
      "First Name": "First Name",
      "Last Name": "Last Name",
      "Type": "Type (Employee / Spouse / Child)",
      "Date of Birth": "Date of Birth",
      "Gender": "Gender (Male / Female)",
      "Zip Code": "Zip Code"
    };

    return (
      <>
        <SimpleHeader hasGroups={hasGroups} step={step} />
        <WizardProgress step={step} />

        {/* Mapping Error Dialog */}
        <AlertDialog open={!!mappingError} onOpenChange={(open) => !open && setMappingError(null)}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Mapping Failed
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base pt-2">
                {mappingError}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setMappingError(null)}>
                OK
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Card className="p-4 border-4 border-black dark:border-white rounded-tl-none">
        <div className="mb-3">
          <div className="flex items-start justify-between gap-4 mb-3">
            <Button variant="outline" size="sm" onClick={() => {
              setStep("upload");
              setParseResult(null);
              setOriginalParseResult(null);
              setCleanedResult(null);
              setColumnMapping({});
              setMappingError(null);
            }}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Upload
            </Button>
            <Button
              size="lg"
              onClick={handleApplyMapping}
              disabled={isApplyingMapping}
              className="font-bold shadow-xl h-12 text-base px-6"
            >
              {isApplyingMapping ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Confirm & Continue</>
              )}
            </Button>
          </div>
          <h2 className="font-semibold text-lg mb-1">Confirm Column Mapping</h2>
          <p className="text-xs text-muted-foreground">
            AI detected your columns. Verify they match correctly or adjust if needed.
          </p>
        </div>

        <div className="space-y-3">
          {/* Column Mapping Table */}
          <div className="rounded-md border">
            <div className="grid grid-cols-2 gap-3 px-2 py-2 bg-muted/50 font-medium text-xs border-b">
              <div>Required Field</div>
              <div>Your CSV Column</div>
            </div>
            {REQUIRED_FIELDS.map((field) => {
              const mappedColumn = Object.keys(columnMapping).find(k => columnMapping[k] === field) || "";
              return (
                <div key={field} className="grid grid-cols-2 gap-3 px-2 py-1.5 border-b last:border-b-0 items-center">
                  <div className="font-medium text-xs">{FIELD_LABELS[field]}</div>
                  <Select
                    value={mappedColumn}
                    onValueChange={(value) => {
                      // Clear any existing mapping to this field
                      const newMapping = { ...columnMapping };
                      Object.keys(newMapping).forEach(k => {
                        if (newMapping[k] === field) delete newMapping[k];
                      });
                      // Set new mapping
                      newMapping[value] = field;
                      setColumnMapping(newMapping);
                    }}
                  >
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      {parseResult.headers.map((header: string) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>

          {/* Sample Data Preview - Only show mapped columns */}
          {parseResult.sampleRows && parseResult.sampleRows.length > 0 && (() => {
            // Get the mapped CSV column names for each required field
            const mappedColumns = REQUIRED_FIELDS.map(field => {
              return Object.keys(columnMapping).find(k => columnMapping[k] === field) || "";
            }).filter(col => col !== "");

            return (
              <div className="rounded-md border-2 border-blue-200 dark:border-blue-800 p-1.5 bg-blue-50 dark:bg-blue-950/30">
                <h3 className="text-[10px] font-semibold mb-1 px-1 text-blue-700 dark:text-blue-300">Your Data Preview (3 rows)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        {REQUIRED_FIELDS.map((field) => {
                          const csvColumn = Object.keys(columnMapping).find(k => columnMapping[k] === field);
                          return csvColumn ? (
                            <th key={field} className="text-left px-1 py-0.5 font-medium text-[10px]">
                              {field}
                              <div className="text-[8px] text-muted-foreground font-normal">({csvColumn})</div>
                            </th>
                          ) : null;
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {parseResult.sampleRows.map((row: any, i: number) => (
                        <tr key={i} className="border-b last:border-b-0">
                          {REQUIRED_FIELDS.map((field) => {
                            const csvColumn = Object.keys(columnMapping).find(k => columnMapping[k] === field);
                            return csvColumn ? (
                              <td key={field} className="px-1 py-0.5 text-[10px]">{row[csvColumn] || "-"}</td>
                            ) : null;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          <Button
            className="w-full h-12 text-base font-bold shadow-xl"
            size="lg"
            onClick={handleApplyMapping}
            disabled={isApplyingMapping}
          >
            {isApplyingMapping ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>Confirm & Continue</>
            )}
          </Button>
        </div>
      </Card>
      </>
    );
  }

  if (step === "confirm" && cleanedResult) {
    const hasWarnings = cleanedResult.warnings.length > 0;
    const rowsWithIssues = cleanedResult.previewRows.filter(r => r.issues && r.issues.length > 0);

    return (
      <>
        <SimpleHeader hasGroups={hasGroups} step={step} />
        <WizardProgress step={step} />
        <Card className="p-6 border-4 border-black dark:border-white rounded-tl-none">
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <Button variant="outline" size="sm" onClick={() => {
              setStep("map-columns");
              setParseResult(originalParseResult);
              setValidationError(null);
            }} data-testid="button-back-mapping">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Column Mapping
            </Button>
            <Button
              size="lg"
              onClick={handleConfirm}
              disabled={isConfirming || validationError !== null}
              className="font-bold shadow-xl h-12 text-base px-8"
              data-testid="button-submit-top"
            >
              {validationError ? (
                <>
                  <X className="mr-2 h-5 w-5" />
                  Fix Errors First
                </>
              ) : isConfirming ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Submit
                </>
              )}
            </Button>
          </div>
          <h2 className="font-semibold text-lg mb-2">✓ AI Cleaned Your Data</h2>
          <p className="text-sm text-muted-foreground">{cleanedResult.summary}</p>
        </div>

        <div className="mb-4 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-700 dark:text-green-400">
              {cleanedResult.cleanedRows} rows processed successfully
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
                  {cleanedResult.warnings.slice(0, 5).map((w, i) => (
                    <li key={i}>• {w}</li>
                  ))}
                  {cleanedResult.warnings.length > 5 && (
                    <li className="italic">...and {cleanedResult.warnings.length - 5} more</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {validationError && (
          <div className="mb-4 rounded-md bg-red-50 dark:bg-red-950/30 border-2 border-red-300 dark:border-red-800 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-2">
                  Validation Failed ({validationError.matchRate}% Data Integrity)
                </h3>
                <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                  {validationError.guidance}
                </p>
                <div className="mb-3">
                  <p className="text-xs font-medium text-red-900 dark:text-red-100 mb-1">Issues Found:</p>
                  <ul className="text-xs text-red-700 dark:text-red-300 space-y-1 ml-4">
                    {validationError.errors.map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setValidationError(null);
                      setStep("upload");
                      setParseResult(null);
                      setOriginalParseResult(null);
                      setCleanedResult(null);
                    }}
                    className="border-red-300 dark:border-red-700"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Upload New File
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="border-red-300 dark:border-red-700"
                  >
                    <a href="/api/groups/template" download>
                      <FileDown className="h-3 w-3 mr-1" />
                      Download Template
                    </a>
                  </Button>
                </div>
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
                {cleanedResult.previewRows.map((row, i) => (
                  <tr key={i} className={`border-b ${row.issues ? 'bg-yellow-50/50 dark:bg-yellow-950/10' : ''}`}>
                    <td className="py-2 px-3">{row.firstName || <span className="text-muted-foreground">—</span>}</td>
                    <td className="py-2 px-3">{row.lastName || <span className="text-muted-foreground">—</span>}</td>
                    <td className="py-2 px-3">
                      <Badge variant="outline" className="text-xs">{row.relationship}</Badge>
                    </td>
                    <td className="py-2 px-3">{formatDateToMMDDYY(row.dob) || <span className="text-muted-foreground">—</span>}</td>
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
          disabled={isConfirming || validationError !== null}
          className="w-full h-14 text-lg font-bold shadow-xl"
          size="lg"
          data-testid="button-confirm-mapping"
          variant={validationError ? "outline" : "default"}
        >
          {validationError ? (
            <>
              <X className="mr-2 h-5 w-5" />
              Cannot Submit - Fix Validation Errors First
            </>
          ) : isConfirming ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing Census...
            </>
          ) : (
            <>
              Looks Good - Submit & Get Risk Analysis <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
      </Card>
      </>
    );
  }

  return null;
}

function GroupsList() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [sortField, setSortField] = useState<"submittedAt" | "companyName" | "riskScore">("submittedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const { data: groups, isLoading } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

  const sortedGroups = useMemo(() => {
    if (!groups) return [];
    return [...groups].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === "submittedAt") {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [groups, sortField, sortDirection]);

  const handleSort = (field: "submittedAt" | "companyName" | "riskScore") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

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
      <Card className="p-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-12 w-full mt-4" />
      </Card>
    );
  }

  if (!groups || groups.length === 0) {
    return (
      <Card className="p-8 text-center">
        <FileSpreadsheet className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="font-semibold">No Submissions Yet</h3>
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

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th
                  className="text-left py-3 px-4 font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => handleSort("submittedAt")}
                >
                  <div className="flex items-center gap-1">
                    Submitted {sortField === "submittedAt" && (sortDirection === "asc" ? "↑" : "↓")}
                  </div>
                </th>
                <th
                  className="text-left py-3 px-4 font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => handleSort("companyName")}
                >
                  <div className="flex items-center gap-1">
                    Company {sortField === "companyName" && (sortDirection === "asc" ? "↑" : "↓")}
                  </div>
                </th>
                <th className="text-left py-3 px-4 font-medium">Census ID</th>
                <th className="text-center py-3 px-4 font-medium">Lives</th>
                <th
                  className="text-center py-3 px-4 font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => handleSort("riskScore")}
                >
                  <div className="flex items-center justify-center gap-1">
                    Score {sortField === "riskScore" && (sortDirection === "asc" ? "↑" : "↓")}
                  </div>
                </th>
                <th className="text-center py-3 px-4 font-medium">Status</th>
                <th className="text-right py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedGroups.map((group) => {
                const censusNumber = `KBA-${group.id.substring(0, 8).toUpperCase()}`;
                const isQualified = group.riskTier === "preferred" || group.riskTier === "standard";
                const tier = group.riskTier ? TIER_CONFIG[group.riskTier] || { label: group.riskTier, color: "text-muted-foreground" } : null;

                return (
                  <tr
                    key={group.id}
                    className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/report/${group.id}`)}
                    data-testid={`row-group-${group.id}`}
                  >
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        {format(new Date(group.submittedAt), "MM/dd/yy")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(group.submittedAt), "h:mm a")}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium" data-testid="text-group-company">
                      {group.companyName}
                    </td>
                    <td className="py-3 px-4">
                      <code className="text-xs text-muted-foreground" data-testid="text-census-number">
                        {censusNumber}
                      </code>
                    </td>
                    <td className="py-3 px-4 text-center" data-testid="text-total-lives">
                      <div className="font-semibold">{group.totalLives}</div>
                      <div className="text-xs text-muted-foreground">
                        {group.employeeCount}e·{group.spouseCount || 0}s·{group.childrenCount}c
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {group.riskScore != null ? (
                        <div>
                          <div className="font-bold text-primary" data-testid="text-risk-score">
                            {group.riskScore.toFixed(2)}
                          </div>
                          {tier && (
                            <div className={`text-xs ${tier.color}`} data-testid="text-risk-tier">
                              {tier.label.replace(" Risk", "")}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isQualified && (
                        <Badge variant="secondary" className="text-xs text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Qualified
                        </Badge>
                      )}
                      {group.riskTier === "high" && (
                        <Badge variant="secondary" className="text-xs text-red-600 dark:text-red-400">
                          High Risk
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/report/${group.id}`);
                          }}
                          data-testid={`button-view-report-${group.id}`}
                        >
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          Report
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => e.stopPropagation()}
                              data-testid={`button-delete-${group.id}`}
                            >
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
                              <AlertDialogAction
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(group.id);
                                }}
                                data-testid="button-confirm-delete"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-company-name">
            {user?.companyName || firstName}
          </h1>
        </div>

        {showAnalysis ? (
          <AnalysisAnimation onComplete={handleAnalysisComplete} group={analyzingGroup} />
        ) : (
          <div className="space-y-6">
            <CensusUploadWizard onComplete={handleUploadComplete} hasGroups={hasGroups} />
            <GroupsList />
          </div>
        )}
      </div>
    </div>
  );
}
