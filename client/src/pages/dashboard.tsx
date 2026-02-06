import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
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
} from "lucide-react";
import kennionLogo from "@assets/qt=q_95_1770371575379.webp";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Group } from "@shared/schema";

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  pending_review: { label: "Pending Review", icon: Clock, color: "text-yellow-600 dark:text-yellow-400" },
  under_review: { label: "Under Review", icon: AlertCircle, color: "text-blue-600 dark:text-blue-400" },
  analyzing: { label: "Analyzing", icon: Activity, color: "text-purple-600 dark:text-purple-400" },
  qualified: { label: "Qualified", icon: CheckCircle2, color: "text-green-600 dark:text-green-400" },
  not_qualified: { label: "Not Qualified", icon: XCircle, color: "text-red-600 dark:text-red-400" },
  rates_available: { label: "Rates Available", icon: TrendingUp, color: "text-green-600 dark:text-green-400" },
};

const TIER_LABELS: Record<string, string> = {
  preferred: "Preferred",
  low: "Low Risk",
  moderate: "Moderate Risk",
  high: "High Risk",
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
        <div className="flex items-center">
          <img src={kennionLogo} alt="Kennion Benefit Advisors" className="h-8 w-auto" />
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

function UploadSection({ onUploadSuccess }: { onUploadSuccess: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState("");

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast({ title: "Invalid file", description: "Please upload a CSV file.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setUploadPhase("Uploading file...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadProgress(30);
      setUploadPhase("Parsing census data...");

      const res = await fetch("/api/groups/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed");
      }

      setUploadProgress(60);
      setUploadPhase("Validating records...");

      await new Promise((r) => setTimeout(r, 800));
      setUploadProgress(80);
      setUploadPhase("Analyzing demographics...");

      await new Promise((r) => setTimeout(r, 600));
      setUploadProgress(95);
      setUploadPhase("Generating initial assessment...");

      await new Promise((r) => setTimeout(r, 500));
      setUploadProgress(100);
      setUploadPhase("Complete!");

      toast({ title: "Census uploaded successfully", description: "Your group has been submitted for review." });
      onUploadSuccess();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadPhase("");
      }, 1000);
    }
  }, [toast, onUploadSuccess]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="font-semibold">Upload Employee Census</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Submit your census data to begin the qualification process.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href="/api/groups/template" download data-testid="button-download-template">
            <Download className="mr-1.5 h-3.5 w-3.5" /> CSV Template
          </a>
        </Button>
      </div>

      {isUploading ? (
        <div className="space-y-4 py-6">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm font-medium">{uploadPhase}</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-center text-xs text-muted-foreground">
            {uploadProgress}% complete
          </p>
        </div>
      ) : (
        <div
          className={`relative rounded-md border-2 border-dashed p-8 text-center transition-colors ${
            isDragging ? "border-primary bg-primary/5" : "border-border"
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
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
          {["First Name", "Last Name", "Date of Birth", "Gender", "Zip Code"].map((col) => (
            <Badge key={col} variant="secondary" className="text-xs">{col}</Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Include all enrolled employees AND their enrolled dependents (spouses, children).
        </p>
      </div>
    </Card>
  );
}

function GroupCard({ group }: { group: Group }) {
  const status = STATUS_CONFIG[group.status] || STATUS_CONFIG.pending_review;
  const StatusIcon = status.icon;

  return (
    <Card className="p-6" data-testid={`card-group-${group.id}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 dark:bg-primary/20">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold" data-testid="text-group-company">{group.companyName}</h3>
            <p className="text-xs text-muted-foreground">
              Submitted {new Date(group.submittedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <StatusIcon className={`h-4 w-4 ${status.color}`} />
          <span className={`text-sm font-medium ${status.color}`} data-testid="text-group-status">
            {status.label}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div>
          <div className="text-xs text-muted-foreground">Employees</div>
          <div className="text-lg font-semibold" data-testid="text-employee-count">{group.employeeCount}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Dependents</div>
          <div className="text-lg font-semibold" data-testid="text-dependent-count">{group.dependentCount}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Total Lives</div>
          <div className="text-lg font-semibold" data-testid="text-total-lives">{group.totalLives}</div>
        </div>
      </div>

      {group.score !== null && group.score !== undefined && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs text-muted-foreground">Qualification Score</span>
            <span className="text-sm font-bold text-primary" data-testid="text-score">{group.score}/100</span>
          </div>
          <Progress value={group.score} className="h-2" />
          {group.riskTier && (
            <div className="mt-2 flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Risk Tier: <strong>{TIER_LABELS[group.riskTier] || group.riskTier}</strong>
              </span>
            </div>
          )}
        </div>
      )}

      {group.adminNotes && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground mb-1">Notes from Kennion:</p>
          <p className="text-sm" data-testid="text-admin-notes">{group.adminNotes}</p>
        </div>
      )}
    </Card>
  );
}

function GroupsList() {
  const { data: groups, isLoading } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

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
      <h2 className="font-semibold">Your Submissions</h2>
      {groups.map((g) => (
        <GroupCard key={g.id} group={g} />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  const handleUploadSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-dashboard-title">
            Benefits Portal
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload your employee census data and track your qualification status.
          </p>
        </div>

        <div className="space-y-6">
          <UploadSection onUploadSuccess={handleUploadSuccess} />
          <GroupsList />
        </div>
      </div>
    </div>
  );
}
