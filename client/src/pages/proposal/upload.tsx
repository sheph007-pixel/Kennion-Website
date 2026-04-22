import { useCallback, useRef, useState } from "react";
import { Upload as UploadIcon, FileText, ShieldCheck, Sparkles, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KennionLogo } from "@/components/kennion-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { Group } from "@shared/schema";

type Props = {
  onComplete: (group: Group) => void;
};

const REQUIRED_FIELDS = [
  "First Name",
  "Last Name",
  "Type (EE / SP / CH)",
  "Date of Birth",
  "Gender",
  "Zip Code",
];

export function ProposalUpload({ onComplete }: Props) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        toast({
          title: "Please upload a CSV",
          description: "The file needs a .csv extension.",
          variant: "destructive",
        });
        return;
      }
      setUploading(true);
      try {
        // Parse + auto-map + confirm in one flow, since we no longer expose
        // the mapping step in the UI.
        const form = new FormData();
        form.append("file", file);
        const parseRes = await fetch("/api/groups/parse", {
          method: "POST",
          body: form,
          credentials: "include",
        });
        if (!parseRes.ok) throw new Error("parse-failed");
        const parsed = await parseRes.json();

        const mappingRes = await fetch("/api/groups/apply-mapping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ columnMapping: parsed.columnMapping ?? {} }),
          credentials: "include",
        });
        if (!mappingRes.ok) throw new Error("mapping-failed");

        const confirm = await apiRequest("POST", "/api/groups/confirm", {});
        const data = await confirm.json();
        await queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
        onComplete(data.group);
      } catch (err) {
        setErrorOpen(true);
      } finally {
        setUploading(false);
      }
    },
    [onComplete, toast],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
            Step 1 of 2
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Upload Your Employee Census
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Include every <strong className="text-foreground">employee</strong> and{" "}
            <strong className="text-foreground">family member</strong> (spouses and children) who will
            be covered under your group health plan. Takes about 2 minutes.
          </p>
        </div>

        <Card
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center border-2 border-dashed px-6 py-14 text-center transition",
            dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            uploading && "pointer-events-none opacity-60",
          )}
          data-testid="dropzone-census"
        >
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="mt-3 font-semibold">Uploading…</div>
              <div className="text-sm text-muted-foreground">Parsing your CSV</div>
            </>
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <UploadIcon className="h-6 w-6 text-primary" />
              </div>
              <div className="mt-3 text-base font-semibold">
                Drag and drop your CSV file here
              </div>
              <div className="text-sm text-muted-foreground">or click anywhere to browse</div>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
            data-testid="input-census-file"
          />
        </Card>

        <Card className="mt-4 border-primary/30 bg-primary/5 p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                  AI
                </Badge>
                <div className="text-sm font-semibold">
                  AI detects columns and cleans data automatically
                </div>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                You don't need to format the file. We'll figure out what each column means.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {REQUIRED_FIELDS.map((f) => (
                  <span
                    key={f}
                    className="rounded-full border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground"
                  >
                    {f}
                  </span>
                ))}
              </div>
              <div className="mt-3 text-xs">
                Don't have a list?{" "}
                <a
                  href="/api/groups/template"
                  className="font-semibold text-primary hover:underline"
                  data-testid="link-download-template"
                >
                  Download example CSV
                </a>
              </div>
            </div>
          </div>
        </Card>

        <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          256-bit encryption · SOC 2 Type II · Your data never leaves our secure pipeline.
        </div>
      </div>

      <Dialog open={errorOpen} onOpenChange={setErrorOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              We couldn't read that file
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Make sure it's a standard CSV with a header row. If you'd like help,
            send your roster to{" "}
            <a href="mailto:hunter@kennion.com" className="text-primary font-semibold">
              hunter@kennion.com
            </a>{" "}
            and we'll get it loaded for you.
          </p>
          <div className="flex justify-end pt-2">
            <Button onClick={() => setErrorOpen(false)}>OK</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TopNav() {
  return (
    <nav className="flex items-center justify-between border-b px-6 py-3">
      <KennionLogo size="md" />
      <ThemeToggle />
    </nav>
  );
}
