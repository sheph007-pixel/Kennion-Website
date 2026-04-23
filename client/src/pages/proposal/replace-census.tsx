import { Loader2 } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProposalNav } from "@/components/proposal/proposal-nav";
import { ProposalUpload } from "@/pages/proposal/upload";
import { useGroupById } from "@/hooks/use-proposal";

// Replace-census page. Thin wrapper that resolves the group from the
// URL, 404s if it doesn't exist, and renders ProposalUpload in replace
// mode. ProposalUpload does all the heavy lifting — AI column mapping,
// validation preview, invalidations. On success we navigate back to
// the cockpit so the user sees the new tier / score / rates.
export default function ReplaceCensusPage() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/dashboard/:groupId/replace-census");
  const groupId = params?.groupId;
  const { group, isLoading } = useGroupById(groupId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <ProposalNav />
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-background">
        <ProposalNav />
        <div className="mx-auto max-w-xl px-6 py-16">
          <Card className="p-8">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              Group not found
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">
              We couldn't find that quote
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              The link may be out of date, or the quote may have been removed.
            </p>
            <Button className="mt-6" onClick={() => navigate("/dashboard/groups")}>
              Back to your groups
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <ProposalUpload
      replaceForGroupId={group.id}
      onComplete={() => navigate(`/dashboard/${group.id}`, { replace: true })}
    />
  );
}
