import { useRoute, useLocation } from "wouter";
import { format } from "date-fns";
import {
  ArrowLeft,
  Download,
  FileBarChart,
  Mail,
  User,
  Loader2,
  ThumbsUp,
  FileText,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AdminLayout } from "./layout";
import { useGroup } from "./hooks";
import { tierConfig } from "./constants";
import { StatusBadge } from "./components/status-badge";
import { OverviewTab } from "./tabs/overview-tab";
import { CensusDataTab } from "./tabs/census-data-tab";
import { RiskAnalysisTab } from "./tabs/risk-analysis-tab";
import { SubmissionsTab } from "./tabs/submissions-tab";
import { NotesStatusTab } from "./tabs/notes-status-tab";
import { ActivityTab } from "./tabs/activity-tab";

function censusId(id: string): string {
  return `KBA-${id.substring(0, 8).toUpperCase()}`;
}


type GroupLike = {
  id: string;
  companyName: string;
  contactEmail: string;
  status: string;
};

function ProposalActions({ group }: { group: GroupLike }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [effectiveDate, setEffectiveDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return d.toISOString().slice(0, 10);
  });

  const approveMut = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/admin/groups/${group.id}/approve`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/groups"] });
      qc.invalidateQueries({ queryKey: ["/api/groups", group.id] });
      toast({ title: "Group approved", description: "You can now generate a proposal." });
    },
    onError: (err: any) =>
      toast({ title: "Approve failed", description: err?.message || "Error", variant: "destructive" }),
  });

  const generateMut = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/admin/proposal/generate/${group.id}`, {
        effectiveDate,
        admin: "EBPA",
      });
    },
    onSuccess: async (res: any) => {
      const json = await res.json().catch(() => ({}));
      qc.invalidateQueries({ queryKey: ["/api/admin/groups"] });
      qc.invalidateQueries({ queryKey: ["/api/groups", group.id] });
      qc.invalidateQueries({ queryKey: ["/api/groups", group.id, "proposals"] });
      toast({
        title: "Proposal generated",
        description: `${json.planCount ?? ""} plans for ${json.ratingArea ?? "group"} (eff. ${json.effectiveDate ?? effectiveDate}).`,
      });
    },
    onError: (err: any) =>
      toast({ title: "Generation failed", description: err?.message || "Error", variant: "destructive" }),
  });

  const viewLatestProposal = async () => {
    try {
      const res = await apiRequest("GET", `/api/admin/proposal/group/${group.id}`);
      const list = await res.json();
      const items = Array.isArray(list) ? list : list?.proposals ?? [];
      if (!items.length) {
        toast({ title: "No proposal yet", description: "Generate one first." });
        return;
      }
      const latest = items[0];
      window.open(`/api/admin/proposal/${latest.id}/pdf`, "_blank");
    } catch (err: any) {
      toast({ title: "Failed to open proposal", description: err?.message || "Error", variant: "destructive" });
    }
  };

  if (group.status === "census_uploaded") {
    return (
      <Button
        size="sm"
        className="gap-1.5"
        disabled={approveMut.isPending}
        onClick={() => approveMut.mutate()}
        data-testid="button-approve-group"
      >
        {approveMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5" />}
        Approve Group
      </Button>
    );
  }

  if (group.status === "approved") {
    return (
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          Effective
          <input
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            data-testid="input-effective-date"
          />
        </label>
        <Button
          size="sm"
          className="gap-1.5"
          disabled={generateMut.isPending}
          onClick={() => generateMut.mutate()}
          data-testid="button-generate-proposal"
        >
          {generateMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileBarChart className="h-3.5 w-3.5" />}
          Generate Proposal
        </Button>
      </div>
    );
  }

  if (group.status === "proposal_sent" || group.status === "proposal_accepted" || group.status === "client") {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={viewLatestProposal}
          data-testid="button-view-proposal"
        >
          <FileText className="h-3.5 w-3.5" />
          View Proposal
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={generateMut.isPending}
          onClick={() => generateMut.mutate()}
          data-testid="button-regenerate-proposal"
        >
          {generateMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Regenerate
        </Button>
      </div>
    );
  }

  // not_approved or unknown
  return null;
}

export default function AdminGroupDetailPage() {
  const [, params] = useRoute("/admin/groups/:id");
  const [, navigate] = useLocation();
  const id = params?.id;
  const { data: group, isLoading } = useGroup(id);

  const label = group?.companyName ?? "Group";
  const tier = tierConfig(group?.riskTier);

  return (
    <AdminLayout
      crumbs={[
        { label: "Admin", href: "/admin/dashboard" },
        { label: "Groups", href: "/admin/groups" },
        { label },
      ]}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading group…
        </div>
      ) : !group ? (
        <Card className="border-card-border p-10 text-center">
          <h2 className="text-lg font-semibold">Group not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This submission may have been deleted.
          </p>
          <Button
            variant="outline"
            className="mt-4 gap-2"
            onClick={() => navigate("/admin/groups")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to groups
          </Button>
        </Card>
      ) : (
        <>
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              className="mb-3 -ml-2 gap-1.5 text-muted-foreground"
              onClick={() => navigate("/admin/groups")}
              data-testid="button-back-to-groups"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All groups
            </Button>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-[-0.02em]">
                    {group.companyName}
                  </h1>
                  <StatusBadge status={group.status} />
                  {tier && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "border-current font-medium",
                        tier.className,
                      )}
                    >
                      {tier.label}
                    </Badge>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 font-mono">
                    {censusId(group.id)}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {group.contactName}
                  </span>
                  <a
                    href={`mailto:${group.contactEmail}`}
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <Mail className="h-3 w-3" />
                    {group.contactEmail}
                  </a>
                  <span>
                    Submitted {format(new Date(group.submittedAt), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => window.open(`/report/${group.id}`, "_blank")}
                  data-testid="button-export-report"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
                <ProposalActions group={group} />
                <Button
                  size="sm"
                  className="gap-1.5"
                  asChild
                  data-testid="button-contact-client"
                >
                  <a href={`mailto:${group.contactEmail}`}>
                    <Mail className="h-3.5 w-3.5" />
                    Contact Client
                  </a>
                </Button>
              </div>
            </div>
          </div>

          <Tabs defaultValue="overview">
            <TabsList className="h-auto w-full justify-start rounded-none border-b border-card-border bg-transparent p-0">
              {[
                { value: "overview", label: "Overview" },
                { value: "census", label: "Census Data" },
                { value: "risk", label: "Risk Analysis" },
                { value: "submissions", label: "Submissions" },
                { value: "notes", label: "Notes & Status" },
                { value: "activity", label: "Activity" },
              ].map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="relative rounded-none border-b-2 border-transparent px-4 py-3 text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                  data-testid={`tab-${t.value}`}
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <OverviewTab group={group} />
            </TabsContent>
            <TabsContent value="census" className="mt-6">
              <CensusDataTab group={group} />
            </TabsContent>
            <TabsContent value="risk" className="mt-6">
              <RiskAnalysisTab group={group} />
            </TabsContent>
            <TabsContent value="submissions" className="mt-6">
              <SubmissionsTab group={group} />
            </TabsContent>
            <TabsContent value="notes" className="mt-6">
              <NotesStatusTab group={group} />
            </TabsContent>
            <TabsContent value="activity" className="mt-6">
              <ActivityTab group={group} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </AdminLayout>
  );
}
