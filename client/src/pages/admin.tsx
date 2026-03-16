import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import {
  LogOut,
  Users,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Activity,
  TrendingUp,
  Search,
  Filter,
  ChevronDown,
  Save,
  Loader2,
  BarChart3,
  FileBarChart,
  User,
  Eye,
  ExternalLink,
  Trash2,
  ArrowUpDown,
  KeyRound,
} from "lucide-react";
import { KennionLogo } from "@/components/kennion-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Group, CensusEntry, User as DbUser } from "@shared/schema";

const TIER_CONFIG: Record<string, { label: string; color: string }> = {
  preferred: { label: "Preferred Risk", color: "text-green-600 dark:text-green-400" },
  standard: { label: "Standard Risk", color: "text-blue-600 dark:text-blue-400" },
  high: { label: "High Risk", color: "text-red-600 dark:text-red-400" },
};

const STATUS_OPTIONS = [
  { value: "census_uploaded", label: "Census Uploaded" },
  { value: "proposal_sent", label: "Proposal Sent" },
  { value: "proposal_accepted", label: "Proposal Accepted" },
  { value: "client", label: "Client" },
  { value: "not_approved", label: "Not Approved" },
];

const STATUS_COLORS: Record<string, string> = {
  census_uploaded: "text-blue-600 dark:text-blue-400",
  proposal_sent: "text-purple-600 dark:text-purple-400",
  proposal_accepted: "text-green-600 dark:text-green-400",
  client: "text-green-600 dark:text-green-400",
  not_approved: "text-red-600 dark:text-red-400",
};

const STATUS_ICONS: Record<string, any> = {
  census_uploaded: Clock,
  proposal_sent: AlertCircle,
  proposal_accepted: CheckCircle2,
  client: TrendingUp,
  not_approved: XCircle,
};

function AdminNav() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-3">
          <KennionLogo size="md" />
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <span className="font-medium text-foreground">Admin Panel</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-md bg-muted/50">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-sm font-medium text-foreground">{user?.fullName}</span>
              <span className="text-xs text-muted-foreground">{user?.email}</span>
            </div>
            <Badge variant="secondary" className="text-xs ml-2">Admin</Badge>
          </div>
          <ThemeToggle />
          <Button variant="outline" onClick={handleLogout} data-testid="button-admin-logout" className="gap-2">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </nav>
  );
}

function StatsOverview({ groups }: { groups: Group[] }) {
  const censusUploaded = groups.filter((g) => g.status === "census_uploaded").length;
  const proposalSent = groups.filter((g) => g.status === "proposal_sent").length;
  const proposalAccepted = groups.filter((g) => g.status === "proposal_accepted").length;
  const client = groups.filter((g) => g.status === "client").length;
  const notApproved = groups.filter((g) => g.status === "not_approved").length;

  const stats = [
    { label: "Census Uploaded", value: censusUploaded, icon: Clock },
    { label: "Proposal Sent", value: proposalSent, icon: AlertCircle },
    { label: "Proposal Accepted", value: proposalAccepted, icon: CheckCircle2 },
    { label: "Client", value: client, icon: TrendingUp },
    { label: "Not Approved", value: notApproved, icon: XCircle },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
      {stats.map((s) => (
        <Card key={s.label} className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 dark:bg-primary/20">
              <s.icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="text-xl font-bold" data-testid={`text-stat-${s.label.toLowerCase().replace(/\s/g, "-")}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function GroupsTable({
  groups,
  sortField,
  sortDirection,
  onSort,
  onDelete,
  onRowClick,
  onViewReport
}: {
  groups: Group[];
  sortField: string;
  sortDirection: "asc" | "desc";
  onSort: (field: string) => void;
  onDelete: (id: number) => void;
  onRowClick: (group: Group) => void;
  onViewReport: (groupId: string) => void;
}) {
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 ml-1 opacity-40" />;
    return sortDirection === "asc" ? "↑" : "↓";
  };

  // Group by company name
  const groupedByCompany = groups.reduce((acc, group) => {
    const company = group.companyName;
    if (!acc[company]) {
      acc[company] = [];
    }
    acc[company].push(group);
    return acc;
  }, {} as Record<string, Group[]>);

  const toggleCompany = (company: string) => {
    const newExpanded = new Set(expandedCompanies);
    if (newExpanded.has(company)) {
      newExpanded.delete(company);
    } else {
      newExpanded.add(company);
    }
    setExpandedCompanies(newExpanded);
  };

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th
                className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onSort("submittedAt")}
              >
                <div className="flex items-center">
                  Submitted <SortIcon field="submittedAt" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onSort("companyName")}
              >
                <div className="flex items-center">
                  Company <SortIcon field="companyName" />
                </div>
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contact</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">View</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedByCompany).map(([companyName, companyGroups]) => {
              const isExpanded = expandedCompanies.has(companyName);
              const censusCount = companyGroups.length;
              const totalLives = companyGroups.reduce((sum, g) => sum + (g.totalLives || 0), 0);
              const latestSubmission = companyGroups.reduce((latest, g) =>
                new Date(g.submittedAt) > new Date(latest.submittedAt) ? g : latest
              );

              return (
                <React.Fragment key={companyName}>
                  {/* Company Summary Row */}
                  <tr
                    className="border-b hover:bg-muted/30 transition-colors cursor-pointer bg-muted/10"
                    onClick={() => toggleCompany(companyName)}
                    data-testid={`row-company-${companyName}`}
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        {format(new Date(latestSubmission.submittedAt), "MM/dd/yy")}
                      </div>
                      <div className="text-xs text-muted-foreground">Latest</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        <div>
                          <div className="font-bold">{companyName}</div>
                          <div className="text-xs text-muted-foreground">{censusCount} census submission{censusCount > 1 ? 's' : ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-muted-foreground text-sm">—</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-muted-foreground text-sm">—</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-muted-foreground text-sm">—</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <Badge variant="secondary" className="text-xs">
                          {censusCount} submission{censusCount > 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCompany(companyName);
                        }}
                      >
                        {isExpanded ? 'Collapse' : 'Expand'}
                      </Button>
                    </td>
                  </tr>

                  {/* Individual Census Rows */}
                  {isExpanded && companyGroups.map((g) => {
                    const censusNumber = `KBA-${g.id.substring(0, 8).toUpperCase()}`;
                    const tier = g.riskTier ? TIER_CONFIG[g.riskTier] || { label: g.riskTier, color: "text-muted-foreground" } : null;

                    return (
                      <tr
                        key={g.id}
                        className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer bg-background"
                        data-testid={`row-group-${g.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRowClick(g);
                        }}
                      >
                        <td className="px-4 py-3 pl-12">
                          <div className="text-sm">
                            {format(new Date(g.submittedAt), "MM/dd/yy")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(g.submittedAt), "h:mm a")}
                          </div>
                        </td>
                        <td className="px-4 py-3 pl-12 text-sm">
                          {g.contactName}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <a href={`mailto:${g.contactEmail}`} className="text-primary hover:underline">
                            {g.contactEmail}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {g.contactPhone || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            {g.status === "census_uploaded" && (
                              <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">
                                <Clock className="h-3 w-3 mr-1" />
                                Census Uploaded
                              </Badge>
                            )}
                            {g.status === "proposal_sent" && (
                              <Badge variant="secondary" className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Proposal Sent
                              </Badge>
                            )}
                            {g.status === "proposal_accepted" && (
                              <Badge variant="default" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Proposal Accepted
                              </Badge>
                            )}
                            {g.status === "client" && (
                              <Badge variant="default" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Client
                              </Badge>
                            )}
                            {g.status === "not_approved" && (
                              <Badge variant="destructive" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20">
                                <XCircle className="h-3 w-3 mr-1" />
                                Not Approved
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewReport(g.id);
                            }}
                            className="gap-1.5"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View Dashboard
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function GroupDetailModal({
  group,
  open,
  onOpenChange,
}: {
  group: Group | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [status, setStatus] = useState(group?.status || "census_uploaded");
  const [adminNotes, setAdminNotes] = useState(group?.adminNotes || "");
  const [isSaving, setIsSaving] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async (data: { status: string; adminNotes: string }) => {
      if (!group) return;
      await apiRequest("PATCH", `/api/admin/groups/${group.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/groups"] });
      toast({ title: "Changes saved", description: "Group status and notes updated." });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = async () => {
    setIsSaving(true);
    await updateMutation.mutateAsync({ status, adminNotes });
    setIsSaving(false);
  };

  if (!group) return null;

  const censusNumber = `KBA-${group.id.substring(0, 8).toUpperCase()}`;
  const tier = group.riskTier ? TIER_CONFIG[group.riskTier] || { label: group.riskTier, color: "text-muted-foreground" } : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-3">
            <Building2 className="h-6 w-6 text-primary" />
            {group.companyName}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Census ID: <code className="text-xs">{censusNumber}</code> • Submitted {format(new Date(group.submittedAt), "MMM d, yyyy 'at' h:mm a")}
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Contact Information */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Contact Information
            </h3>
            <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">Contact Name</Label>
                <p className="font-medium">{group.contactName}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <p className="font-medium">{group.contactEmail}</p>
              </div>
            </div>
          </div>

          {/* Census Details */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Census Details
            </h3>
            <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">Total Lives</Label>
                <p className="font-bold text-lg">{group.totalLives}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Breakdown</Label>
                <p className="font-medium">{group.employeeCount}e · {group.spouseCount || 0}s · {group.childrenCount}c</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Average Age</Label>
                <p className="font-medium">{group.averageAge ? group.averageAge.toFixed(1) : "—"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Gender Split</Label>
                <p className="font-medium">{group.maleCount}M · {group.femaleCount}F</p>
              </div>
            </div>
          </div>

          {/* Risk Analysis */}
          {group.riskScore != null && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Risk Analysis
              </h3>
              <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">Risk Score</Label>
                  <p className="font-bold text-2xl text-primary">{group.riskScore.toFixed(2)}</p>
                </div>
                {tier && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Risk Tier</Label>
                    <p className={`font-bold text-lg ${tier.color}`}>{tier.label}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status */}
          <div>
            <Label htmlFor="status" className="text-sm font-semibold flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4" />
              Status
            </Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Admin Notes */}
          <div>
            <Label htmlFor="notes" className="text-sm font-semibold flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4" />
              Admin Notes
            </Label>
            <Textarea
              id="notes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add notes about this group..."
              rows={5}
              className="resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReportModal({
  groupId,
  open,
  onOpenChange,
}: {
  groupId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!groupId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl flex items-center gap-2">
            <FileBarChart className="h-5 w-5" />
            Census Report
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <iframe
            src={`/report/${groupId}`}
            className="w-full h-full border-0"
            title="Census Report"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UserManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<DbUser | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: users, isLoading } = useQuery<DbUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User deleted", description: "The user has been removed." });
      setDeleteUserId(null);
    },
    onError: (error: any) => {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DbUser> }) => {
      return await apiRequest("PATCH", `/api/admin/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User updated", description: "User details have been saved." });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const filtered = users?.filter(user =>
    user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.companyName?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          {filtered.length} {filtered.length === 1 ? 'user' : 'users'}
        </Badge>
      </div>

      {isLoading ? (
        <Card className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="font-semibold">No users found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {searchQuery ? "Try adjusting your search." : "No registered users yet."}
          </p>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Verified</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Joined</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">{user.fullName}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3 text-sm">{user.companyName || '—'}</td>
                    <td className="px-4 py-3 text-sm">{user.phone || '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {user.verified ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {format(new Date(user.createdAt!), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteUserId(user.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <EditUserDialog
        user={selectedUser}
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setSelectedUser(null);
        }}
        onSave={(data) => {
          if (selectedUser) {
            updateUserMutation.mutate({ id: selectedUser.id, data });
          }
        }}
        isSaving={updateUserMutation.isPending}
      />

      <AlertDialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserId && deleteUserMutation.mutate(deleteUserId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function EditUserDialog({
  user,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: {
  user: DbUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<DbUser>) => void;
  isSaving: boolean;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    companyName: '',
    phone: '',
    role: 'client',
    verified: false,
  });
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  React.useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || '',
        email: user.email || '',
        companyName: user.companyName || '',
        phone: user.phone || '',
        role: user.role || 'client',
        verified: user.verified || false,
      });
    }
  }, [user]);

  const handleResetPassword = async () => {
    if (!user) return;

    setIsResettingPassword(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to send reset email');
      }

      const data = await res.json();
      toast({
        title: "Password reset sent",
        description: `Reset email sent to ${user.email}`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to send reset email",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user details and permissions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="verified"
              checked={formData.verified}
              onChange={(e) => setFormData({ ...formData, verified: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="verified" className="cursor-pointer">Verified</Label>
          </div>
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Password Reset</p>
                <p className="text-xs text-muted-foreground">Send password reset email to user</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetPassword}
                disabled={isResettingPassword || isSaving}
              >
                {isResettingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-2 h-3 w-3" />
                    Send Reset Email
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => onSave(formData)} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<string>("submittedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [reportGroupId, setReportGroupId] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const { toast } = useToast();

  const { data: groups, isLoading } = useQuery<Group[]>({
    queryKey: ["/api/admin/groups"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/groups"] });
      toast({ title: "Group deleted", description: "The group has been removed." });
    },
    onError: (error: any) => {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    },
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this group?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleRowClick = (group: Group) => {
    setSelectedGroup(group);
    setIsDetailModalOpen(true);
  };

  const handleViewReport = (groupId: string) => {
    setReportGroupId(groupId);
    setIsReportModalOpen(true);
  };

  const filtered = (groups || [])
    .filter((g) => {
      const matchSearch =
        g.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.contactName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === "all" || g.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      let aVal: any, bVal: any;

      if (sortField === "submittedAt") {
        aVal = new Date(a.submittedAt).getTime();
        bVal = new Date(b.submittedAt).getTime();
      } else if (sortField === "companyName") {
        aVal = a.companyName.toLowerCase();
        bVal = b.companyName.toLowerCase();
      } else if (sortField === "riskScore") {
        aVal = a.riskScore ?? -1;
        bVal = b.riskScore ?? -1;
      } else {
        return 0;
      }

      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-admin-title">
            Admin Console
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage group submissions, users, and system settings.
          </p>
        </div>

        <Tabs defaultValue="groups" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="groups" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Groups
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="groups" className="mt-0">
            {isLoading ? (
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-12 w-full" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="mb-6">
            <StatsOverview groups={groups || []} />
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
          <div className="relative flex-1 w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-groups"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48" data-testid="select-status-filter">
              <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <Card className="p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center">
            <FileBarChart className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-semibold">No groups found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your search or filters."
                : "Groups will appear here once clients submit their census data."}
            </p>
          </Card>
        ) : (
          <GroupsTable
            groups={filtered}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            onDelete={handleDelete}
            onRowClick={handleRowClick}
            onViewReport={handleViewReport}
          />
        )}

            <GroupDetailModal
              group={selectedGroup}
              open={isDetailModalOpen}
              onOpenChange={setIsDetailModalOpen}
            />

            <ReportModal
              groupId={reportGroupId}
              open={isReportModalOpen}
              onOpenChange={setIsReportModalOpen}
            />
          </TabsContent>

          <TabsContent value="users" className="mt-0">
            <UserManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
