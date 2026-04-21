import { useState } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import type { Proposal } from "@shared/schema";
import {
  Building2,
  Download,
  FileBarChart,
  FileSpreadsheet,
  FileText,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { AdminLayout } from "./layout";
import {
  useGroups,
  useTemplateInfo,
  useTemplateSheets,
} from "./hooks";
import { StatusBadge } from "./components/status-badge";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ProposalStatusCell({ groupId }: { groupId: string }) {
  const { data: proposals } = useQuery<Proposal[]>({
    queryKey: ["/api/admin/proposal/group", groupId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/proposal/group/${groupId}`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  if (!proposals || proposals.length === 0) {
    return <span className="text-[11px] text-muted-foreground">No PDF</span>;
  }
  const latest = proposals[0];
  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1.5 text-green-700 dark:text-green-400"
      onClick={() =>
        window.open(`/api/admin/proposal/${latest.id}/pdf`, "_blank")
      }
    >
      <FileText className="h-3.5 w-3.5" />
      View PDF
    </Button>
  );
}

export default function AdminGeneratorPage() {
  const { toast } = useToast();
  const { data: templateInfo, isLoading: templateLoading } = useTemplateInfo();
  const { data: sheetsData } = useTemplateSheets(!!templateInfo?.uploaded);
  const { data: groups, isLoading: groupsLoading } = useGroups();
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [selectedSheet, setSelectedSheet] = useState("Census");

  async function handleUploadTemplate(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsm")) {
      toast({
        title: "Invalid file",
        description: "Upload a .xlsm template.",
        variant: "destructive",
      });
      return;
    }
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append("template", file);
      const res = await fetch("/api/admin/proposal/upload-template", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Upload failed");
      }
      const data = await res.json();
      toast({
        title: "Template uploaded",
        description: `${data.fileName} — ${data.sheetNames?.length ?? "?"} sheets`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/proposal/template-info"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/proposal/sheets"] });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDeleteTemplate() {
    try {
      const res = await fetch("/api/admin/proposal/template", {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove template");
      toast({ title: "Template removed" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/proposal/template-info"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/proposal/sheets"] });
    } catch (err: any) {
      toast({ title: "Remove failed", description: err.message, variant: "destructive" });
    }
  }

  async function handleGenerate(groupId: string, companyName: string) {
    setIsGenerating(groupId);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 180000);
      const res = await fetch(`/api/admin/proposal/generate/${groupId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetSheet: selectedSheet }),
        credentials: "include",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        let msg = "Generation failed";
        const ct = res.headers.get("Content-Type") ?? "";
        if (ct.includes("application/json")) {
          try {
            const err = await res.json();
            msg = err.message ?? msg;
          } catch {
            msg = `Server error (${res.status})`;
          }
        } else {
          msg = `Server error (${res.status}): ${res.statusText}`;
        }
        throw new Error(msg);
      }
      const data = await res.json();
      toast({
        title: "Proposal generated",
        description: `PDF created for ${companyName} and posted to their group.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/proposal/group", groupId] });
      if (data.proposalId) {
        window.open(`/api/admin/proposal/${data.proposalId}/pdf`, "_blank");
      }
    } catch (err: any) {
      const msg =
        err.name === "AbortError"
          ? "Timed out. LibreOffice may need more time — try again."
          : err.message ?? "Unknown error";
      toast({ title: "Generation failed", description: msg, variant: "destructive" });
    } finally {
      setIsGenerating(null);
    }
  }

  return (
    <AdminLayout
      crumbs={[
        { label: "Admin", href: "/admin/dashboard" },
        { label: "Proposal Generator" },
      ]}
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-[-0.02em]">Proposal Generator</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload the actuary's XLSM, pick the census target sheet, and generate
          PDF proposals per group.
        </p>
      </div>

      <Card className="border-card-border p-5">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-primary" />
          <h2 className="font-semibold tracking-tight">XLSM Template</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Census data is injected into the selected sheet, then LibreOffice
          converts the workbook to PDF.
        </p>

        <div className="mt-4">
          {templateLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : templateInfo?.uploaded ? (
            <div className="flex items-center justify-between rounded-lg border border-card-border bg-muted/30 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-green-500/10">
                  <FileSpreadsheet className="h-5 w-5 text-green-700 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">{templateInfo.fileName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatFileSize(templateInfo.fileSize ?? 0)}
                    {templateInfo.uploadedAt &&
                      ` · uploaded ${format(new Date(templateInfo.uploadedAt), "MMM d, yyyy 'at' h:mm a")}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label>
                  <input
                    type="file"
                    accept=".xlsm"
                    onChange={handleUploadTemplate}
                    className="hidden"
                    disabled={isUploading}
                  />
                  <Button variant="outline" size="sm" asChild disabled={isUploading}>
                    <span className="cursor-pointer">
                      <Upload className="mr-1.5 h-3.5 w-3.5" />
                      Replace
                    </span>
                  </Button>
                </label>
                <Button variant="ghost" size="sm" onClick={handleDeleteTemplate}>
                  <X className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-card-border p-8 transition-colors hover:border-primary/50 hover:bg-muted/20">
              <input
                type="file"
                accept=".xlsm"
                onChange={handleUploadTemplate}
                className="hidden"
                disabled={isUploading}
              />
              {isUploading ? (
                <>
                  <Loader2 className="mb-2 h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm font-medium">Uploading…</p>
                </>
              ) : (
                <>
                  <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Click to upload XLSM template</p>
                  <p className="mt-1 text-xs text-muted-foreground">Accepts .xlsm files with macros</p>
                </>
              )}
            </label>
          )}
        </div>

        {sheetsData && sheetsData.sheets.length > 0 && (
          <div className="mt-4">
            <Label className="mb-1.5 block text-sm font-medium">
              Target sheet for census data
            </Label>
            <Select value={selectedSheet} onValueChange={setSelectedSheet}>
              <SelectTrigger className="w-64">
                <SelectValue />
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
        )}
      </Card>

      <Card className="mt-6 border-card-border p-5">
        <div className="flex items-center gap-2">
          <FileBarChart className="h-4 w-4 text-primary" />
          <h2 className="font-semibold tracking-tight">Generate Proposals</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Pick a group to inject its census into the template and produce a
          PDF. The file is attached to the group for the client to download.
        </p>

        <div className="mt-5">
          {!templateInfo?.uploaded ? (
            <div className="rounded-lg border border-dashed border-card-border bg-muted/20 p-8 text-center">
              <FileSpreadsheet className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">
                Upload a template first.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                You need an XLSM before any proposals can be generated.
              </p>
            </div>
          ) : groupsLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !groups || groups.length === 0 ? (
            <div className="rounded-lg border border-dashed border-card-border bg-muted/20 p-8 text-center">
              <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">
                No groups available yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr className="border-b border-card-border text-muted-foreground">
                    <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide">Company</th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide">Contact</th>
                    <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-wide">Lives</th>
                    <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-wide">Proposal</th>
                    <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-wide">Generate</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => (
                    <tr key={g.id} className="border-b border-card-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{g.companyName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{g.contactName}</td>
                      <td className="px-4 py-3 text-center">{g.totalLives ?? 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <StatusBadge status={g.status} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ProposalStatusCell groupId={g.id} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          size="sm"
                          onClick={() => handleGenerate(g.id, g.companyName)}
                          disabled={isGenerating === g.id}
                          className="gap-1.5"
                          data-testid={`button-generate-${g.id}`}
                        >
                          {isGenerating === g.id ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Generating…
                            </>
                          ) : (
                            <>
                              <Download className="h-3.5 w-3.5" />
                              Generate
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </AdminLayout>
  );
}
