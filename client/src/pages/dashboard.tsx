import { useState, useCallback } from "react";
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
} from "lucide-react";
import { KennionLogo } from "@/components/kennion-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface ParseResult {
  headers: string[];
  totalRows: number;
  suggestedMappings: Record<string, string | null>;
  previewRows: Record<string, string>[];
  requiredFields: { key: string; label: string }[];
}

function CensusUploadWizard({ onComplete }: { onComplete: () => void }) {
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
      toast({ title: "Census uploaded", description: "Your census has been analyzed successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      onComplete();
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
                              <span>{v || "—"}</span>
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
                Analyzing...
              </>
            ) : (
              <>
                Continue <ArrowRight className="ml-1.5 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </Card>
    );
  }

  return null;
}

function GroupCard({ group, onClick }: { group: Group; onClick: () => void }) {
  const status = STATUS_CONFIG[group.status] || STATUS_CONFIG.pending_review;
  const StatusIcon = status.icon;
  const tier = group.riskTier ? TIER_CONFIG[group.riskTier] || { label: group.riskTier, color: "text-muted-foreground" } : null;

  return (
    <Card
      className="p-6 cursor-pointer hover-elevate transition-colors"
      onClick={onClick}
      data-testid={`card-group-${group.id}`}
    >
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
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <StatusIcon className={`h-4 w-4 ${status.color}`} />
            <span className={`text-sm font-medium ${status.color}`} data-testid="text-group-status">
              {status.label}
            </span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-4">
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
        <div className="mt-4 pt-4 border-t flex items-center justify-between gap-4 flex-wrap">
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
          {group.score != null && (
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Qualification</div>
              <div className="text-sm font-semibold" data-testid="text-score">{group.score}/100</div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function GroupsList() {
  const [, navigate] = useLocation();
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
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Your Census Submissions</h2>
        <Badge variant="secondary">{groups.length} submission{groups.length !== 1 ? "s" : ""}</Badge>
      </div>
      {groups.map((g) => (
        <GroupCard key={g.id} group={g} onClick={() => navigate(`/report/${g.id}`)} />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [showUpload, setShowUpload] = useState(true);

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
          <CensusUploadWizard onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
          }} />
          <GroupsList />
        </div>
      </div>
    </div>
  );
}
