import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Group, CensusEntry } from "@shared/schema";

const STATUS_OPTIONS = [
  { value: "pending_review", label: "Pending Review" },
  { value: "under_review", label: "Under Review" },
  { value: "analyzing", label: "Analyzing" },
  { value: "qualified", label: "Qualified" },
  { value: "not_qualified", label: "Not Qualified" },
  { value: "rates_available", label: "Rates Available" },
];

const STATUS_COLORS: Record<string, string> = {
  pending_review: "text-yellow-600 dark:text-yellow-400",
  under_review: "text-blue-600 dark:text-blue-400",
  analyzing: "text-purple-600 dark:text-purple-400",
  qualified: "text-green-600 dark:text-green-400",
  not_qualified: "text-red-600 dark:text-red-400",
  rates_available: "text-green-600 dark:text-green-400",
};

const STATUS_ICONS: Record<string, any> = {
  pending_review: Clock,
  under_review: AlertCircle,
  analyzing: Activity,
  qualified: CheckCircle2,
  not_qualified: XCircle,
  rates_available: TrendingUp,
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
        <KennionLogo size="md" />
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-xs">Admin</Badge>
          <ThemeToggle />
          <Button size="icon" variant="ghost" onClick={handleLogout} data-testid="button-admin-logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </nav>
  );
}

function StatsOverview({ groups }: { groups: Group[] }) {
  const totalGroups = groups.length;
  const pending = groups.filter((g) => g.status === "pending_review" || g.status === "under_review").length;
  const qualified = groups.filter((g) => g.status === "qualified" || g.status === "rates_available").length;
  const totalLives = groups.reduce((sum, g) => sum + (g.totalLives || 0), 0);

  const stats = [
    { label: "Total Groups", value: totalGroups, icon: Building2 },
    { label: "Pending Review", value: pending, icon: Clock },
    { label: "Qualified", value: qualified, icon: CheckCircle2 },
    { label: "Total Lives", value: totalLives.toLocaleString(), icon: Users },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
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

function GroupDetailDialog({
  group,
  open,
  onClose,
}: {
  group: Group | null;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [status, setStatus] = useState(group?.status || "pending_review");
  const [score, setScore] = useState(group?.score?.toString() || "");
  const [riskTier, setRiskTier] = useState(group?.riskTier || "");
  const [notes, setNotes] = useState(group?.adminNotes || "");
  const [isSaving, setIsSaving] = useState(false);

  const { data: census, isLoading: censusLoading } = useQuery<CensusEntry[]>({
    queryKey: ["/api/admin/groups", group?.id, "census"],
    enabled: !!group?.id && open,
  });

  async function handleSave() {
    if (!group) return;
    setIsSaving(true);
    try {
      await apiRequest("PATCH", `/api/admin/groups/${group.id}`, {
        status,
        score: score ? parseInt(score) : undefined,
        riskTier: riskTier || undefined,
        adminNotes: notes || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/groups"] });
      toast({ title: "Group updated", description: "Changes saved successfully." });
      onClose();
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }

  if (!group) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {group.companyName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Contact</Label>
              <p className="text-sm font-medium">{group.contactName}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <p className="text-sm font-medium">{group.contactEmail}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Employees</Label>
              <p className="text-sm font-medium">{group.employeeCount}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Total Lives</Label>
              <p className="text-sm font-medium">{group.totalLives}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Submitted</Label>
              <p className="text-sm font-medium">{new Date(group.submittedAt).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-3">Update Status</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger data-testid="select-status">
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
              <div className="space-y-2">
                <Label>Score (0-100)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  placeholder="e.g. 85"
                  data-testid="input-score"
                />
              </div>
              <div className="space-y-2">
                <Label>Risk Tier</Label>
                <Select value={riskTier} onValueChange={setRiskTier}>
                  <SelectTrigger data-testid="select-risk-tier">
                    <SelectValue placeholder="Select tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preferred">Preferred</SelectItem>
                    <SelectItem value="low">Low Risk</SelectItem>
                    <SelectItem value="moderate">Moderate Risk</SelectItem>
                    <SelectItem value="high">High Risk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Label>Notes to Client</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter notes visible to the client..."
                data-testid="input-notes"
                className="resize-none"
                rows={3}
              />
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={handleSave} disabled={isSaving} data-testid="button-save-group">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </div>
          </div>

          {census && census.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3">
                Census Data ({census.length} records)
              </h4>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">DOB</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Gender</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Zip</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {census.map((entry) => (
                      <tr key={entry.id} className="border-b last:border-0">
                        <td className="px-3 py-2">{entry.firstName} {entry.lastName}</td>
                        <td className="px-3 py-2">{entry.dateOfBirth}</td>
                        <td className="px-3 py-2 capitalize">{entry.gender}</td>
                        <td className="px-3 py-2">{entry.zipCode}</td>
                        <td className="px-3 py-2 capitalize">{entry.relationship}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {censusLoading && (
            <div className="border-t pt-4">
              <Skeleton className="h-4 w-32 mb-3" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GroupsTable({ groups, onSelect }: { groups: Group[]; onSelect: (g: Group) => void }) {
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Company</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contact</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Lives</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Score</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Submitted</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => {
              const StatusIcon = STATUS_ICONS[g.status] || Clock;
              return (
                <tr key={g.id} className="border-b last:border-0 hover-elevate cursor-pointer" onClick={() => onSelect(g)} data-testid={`row-group-${g.id}`}>
                  <td className="px-4 py-3 font-medium">{g.companyName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{g.contactName}</td>
                  <td className="px-4 py-3">{g.totalLives}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <StatusIcon className={`h-3.5 w-3.5 ${STATUS_COLORS[g.status]}`} />
                      <span className={`text-xs font-medium ${STATUS_COLORS[g.status]}`}>
                        {STATUS_OPTIONS.find((o) => o.value === g.status)?.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {g.score !== null && g.score !== undefined ? (
                      <span className="font-medium">{g.score}</span>
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(g.submittedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" data-testid={`button-edit-${g.id}`}>
                      Edit
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function AdminPage() {
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: groups, isLoading } = useQuery<Group[]>({
    queryKey: ["/api/admin/groups"],
  });

  const filtered = (groups || []).filter((g) => {
    const matchSearch =
      g.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.contactName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === "all" || g.status === statusFilter;
    return matchSearch && matchStatus;
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
            Manage group submissions and qualification status.
          </p>
        </div>

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
          <GroupsTable groups={filtered} onSelect={(g) => setSelectedGroup(g)} />
        )}

        <GroupDetailDialog
          group={selectedGroup}
          open={!!selectedGroup}
          onClose={() => setSelectedGroup(null)}
        />
      </div>
    </div>
  );
}
