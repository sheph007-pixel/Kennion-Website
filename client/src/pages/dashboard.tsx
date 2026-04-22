import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useCurrentGroup } from "@/hooks/use-proposal";
import { ProposalCockpit } from "@/pages/proposal/cockpit";
import { ProposalUpload } from "@/pages/proposal/upload";
import { ProposalAnalyzing } from "@/pages/proposal/analyzing";
import { ProposalHighRisk } from "@/pages/proposal/high-risk";
import { ProposalAccept } from "@/pages/proposal/accept";
import type { Group } from "@shared/schema";

// Thin screen router. The customer's portal used to be wizard + list +
// separate proposals + separate report pages. In the new design there is
// "one group, one census, one proposal" so this page is a small state
// machine over the group's lifecycle.
type Screen = "upload" | "analyzing" | "proposal" | "accept";

export default function DashboardPage() {
  const { group, isLoading } = useCurrentGroup();
  const [screen, setScreen] = useState<Screen>("proposal");
  const [analyzingGroup, setAnalyzingGroup] = useState<Group | null>(null);

  const hasGroup = Boolean(group);
  const riskReady = Boolean(group?.riskTier);

  useEffect(() => {
    if (!hasGroup) {
      setScreen("upload");
    } else if (screen === "upload") {
      setScreen("proposal");
    }
  }, [hasGroup, screen]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (screen === "upload" || !group) {
    return (
      <ProposalUpload
        onComplete={(g) => {
          setAnalyzingGroup(g);
          setScreen("analyzing");
        }}
      />
    );
  }

  if (screen === "analyzing") {
    return (
      <ProposalAnalyzing
        group={analyzingGroup ?? group}
        onComplete={() => {
          setAnalyzingGroup(null);
          setScreen("proposal");
        }}
      />
    );
  }

  // Only Preferred + Standard groups see the proposal; High Risk groups
  // get a polite "we'll reach out" screen and no rates.
  if (riskReady && group.riskTier === "high") {
    return <ProposalHighRisk />;
  }

  if (screen === "accept") {
    return (
      <ProposalAccept
        group={group}
        onBack={() => setScreen("proposal")}
        onDone={() => setScreen("proposal")}
      />
    );
  }

  return (
    <ProposalCockpit
      group={group}
      onReplaceCensus={() => setScreen("upload")}
      onAcceptProposal={() => setScreen("accept")}
    />
  );
}
