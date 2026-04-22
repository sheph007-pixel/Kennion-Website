import { useEffect, useState } from "react";
import { Link } from "wouter";
import { FileWarning, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useTemplateInfo, useTemplateSheets } from "@/pages/admin/hooks";
import type { Group } from "@shared/schema";

type Props = {
  group: Group;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Admin-only: generate a proposal PDF for a group by injecting its
// census into the uploaded XLSM template. Subsumes the old generator
// page — any sheet-selection, missing-template, and success states
// happen here, reachable from the admin banner on the cockpit.
export function GenerateProposalDialog({ group, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const { data: templateInfo } = useTemplateInfo();
  const { data: sheetsData } = useTemplateSheets(!!templateInfo?.uploaded);
  const [selectedSheet, setSelectedSheet] = useState<string | undefined>(undefined);
  const [generating, setGenerating] = useState(false);

  // Auto-select the first sheet whenever the sheet list arrives.
  useEffect(() => {
    if (!selectedSheet && sheetsData?.sheets?.length) {
      setSelectedSheet(sheetsData.sheets[0]);
    }
  }, [sheetsData, selectedSheet]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 180_000);
      const res = await fetch(`/api/admin/proposal/generate/${group.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetSheet: selectedSheet }),
        credentials: "include",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const ct = res.headers.get("Content-Type") ?? "";
        let msg = `Server error (${res.status})`;
        if (ct.includes("application/json")) {
          const err = await res.json().catch(() => ({}));
          msg = err.message ?? msg;
        }
        throw new Error(msg);
      }
      const data = await res.json();
      toast({
        title: "Proposal generated",
        description: `PDF created for ${group.companyName}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/proposal/group", group.id] });
      if (data.proposalId) {
        window.open(`/api/admin/proposal/${data.proposalId}/pdf`, "_blank");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Generation failed",
        description: err?.name === "AbortError" ? "Timed out after 3 minutes." : err?.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="dialog-generate-proposal">
        <DialogHeader>
          <DialogTitle>Generate proposal</DialogTitle>
          <DialogDescription>
            Inject this group's census into the XLSM template and produce a PDF.
          </DialogDescription>
        </DialogHeader>

        {!templateInfo?.uploaded ? (
          <div className="flex items-start gap-3 rounded-md border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
            <FileWarning className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
            <div>
              <div className="font-semibold">No template uploaded yet</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Upload an .xlsm template before generating any proposals.
              </p>
              <Link
                href="/admin/templates"
                className="mt-2 inline-block text-xs font-semibold text-primary hover:underline"
              >
                Upload template →
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Template:</span>{" "}
              {templateInfo.fileName}
            </div>
            {sheetsData?.sheets?.length ? (
              <div className="space-y-1.5">
                <Label htmlFor="sheet">Census target sheet</Label>
                <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                  <SelectTrigger id="sheet">
                    <SelectValue placeholder="Choose a sheet" />
                  </SelectTrigger>
                  <SelectContent>
                    {sheetsData.sheets.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">Loading sheets…</div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!templateInfo?.uploaded || !selectedSheet || generating}
            data-testid="button-confirm-generate"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              "Generate"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
