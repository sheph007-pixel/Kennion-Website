import { useRoute, useLocation } from "wouter";
import { format } from "date-fns";
import {
  ArrowLeft,
  Download,
  FileBarChart,
  Mail,
  User,
  Loader2,
} from "lucide-react";
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
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => navigate("/admin/generator")}
                  data-testid="button-generate-proposal"
                >
                  <FileBarChart className="h-3.5 w-3.5" />
                  Generate Proposal
                </Button>
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
