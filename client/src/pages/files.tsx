import { useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Copy,
  Check,
  Download,
  File as FileIcon,
  FolderLock,
  Loader2,
  Lock,
  Settings as SettingsIcon,
  ShieldCheck,
  Trash2,
  Upload,
  Link as LinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { KennionLogo } from "@/components/kennion-logo";
import { ThemeToggle } from "@/components/theme-toggle";

// ── Types (mirror the server's /api/files payloads) ──────────────────
interface FileMeta {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}
interface FilesSession {
  role: "none" | "viewer" | "admin";
  name?: string;
  note?: string | null;
  files?: FileMeta[];
  // admin-only
  viewerCode?: string;
  adminCode?: string | null;
  link?: string;
}

const SESSION_KEY = ["/api/files/session"];

function formatBytes(n: number): string {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard blocked — no-op */
        }
      }}
      data-testid={`button-copy-${label ?? "value"}`}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {label ? <span className="ml-1.5">{copied ? "Copied" : label}</span> : null}
    </Button>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <KennionLogo size="sm" />
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}

function FileRow({
  file,
  downloadHref,
  onDelete,
}: {
  file: FileMeta;
  downloadHref: string;
  onDelete?: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <FileIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{file.fileName}</p>
          <p className="text-xs text-muted-foreground">{formatBytes(file.sizeBytes)}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <a href={downloadHref} data-testid={`link-download-${file.id}`}>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
            <span className="ml-1.5 hidden sm:inline">Download</span>
          </Button>
        </a>
        {onDelete ? (
          <Button variant="ghost" size="icon" className="text-destructive" onClick={onDelete} title="Remove file">
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </li>
  );
}

// ── Code gate (shown when role === 'none') ───────────────────────────
function CodeGate() {
  const { toast } = useToast();
  const [code, setCode] = useState("");

  const unlock = useMutation({
    mutationFn: async (accessCode: string) => {
      const res = await apiRequest("POST", "/api/files/access", { code: accessCode });
      return (await res.json()) as FilesSession;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(SESSION_KEY, data);
    },
    onError: (err: any) => {
      toast({
        title: "Access denied",
        description: err?.message?.replace(/^\d+:\s*/, "") || "That code didn't work.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FolderLock className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Secure Files</h1>
          <p className="text-sm text-muted-foreground">Enter your access code to continue.</p>
        </div>
      </div>
      <Card className="p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) unlock.mutate(code.trim());
          }}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <Label htmlFor="access-code">Access code</Label>
            <Input
              id="access-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter code"
              autoComplete="off"
              autoCapitalize="characters"
              className="mt-1.5 font-mono tracking-widest"
              data-testid="input-access-code"
            />
          </div>
          <Button type="submit" disabled={unlock.isPending || !code.trim()} data-testid="button-unlock">
            {unlock.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            <span className="ml-1.5">Unlock</span>
          </Button>
        </form>
      </Card>
    </div>
  );
}

function LockButton() {
  const lock = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/files/lock", {});
    },
    onSuccess: () => queryClient.setQueryData(SESSION_KEY, { role: "none" } as FilesSession),
  });
  return (
    <div className="mt-6 text-center">
      <Button variant="ghost" size="sm" onClick={() => lock.mutate()} disabled={lock.isPending}>
        <Lock className="h-4 w-4" />
        <span className="ml-1.5">Sign out</span>
      </Button>
    </div>
  );
}

// ── Viewer view (role === 'viewer') ──────────────────────────────────
function ViewerView({ session }: { session: FilesSession }) {
  const files = session.files ?? [];
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FolderLock className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{session.name || "Secure Files"}</h1>
          {session.note ? <p className="text-sm text-muted-foreground">{session.note}</p> : null}
        </div>
      </div>
      <Card className="overflow-hidden">
        {files.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">No files have been shared yet.</p>
        ) : (
          <ul className="divide-y">
            {files.map((f) => (
              <FileRow key={f.id} file={f} downloadHref={`/api/files/download/${f.id}`} />
            ))}
          </ul>
        )}
      </Card>
      <LockButton />
    </div>
  );
}

// ── Admin view (role === 'admin') ────────────────────────────────────
function AdminView({ session }: { session: FilesSession }) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const files = session.files ?? [];

  const setSession = (data: FilesSession) => queryClient.setQueryData(SESSION_KEY, data);

  const removeFile = useMutation({
    mutationFn: async (fileId: string) => {
      const res = await apiRequest("DELETE", `/api/files/${fileId}`);
      return (await res.json()) as FilesSession;
    },
    onSuccess: setSession,
    onError: (err: any) =>
      toast({ title: "Couldn't remove file", description: err?.message?.replace(/^\d+:\s*/, "") || "", variant: "destructive" }),
  });

  async function handleUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const fd = new FormData();
    Array.from(fileList).forEach((f) => fd.append("files", f));
    setUploading(true);
    try {
      const res = await fetch("/api/files/upload", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) {
        const msg = (await res.json().catch(() => ({}))).message || "Upload failed";
        throw new Error(msg);
      }
      setSession((await res.json()) as FilesSession);
      toast({ title: "Uploaded", description: `${fileList.length} file(s) added.` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err?.message || "", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FolderLock className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{session.name || "Secure Files"}</h1>
              <Badge className="bg-emerald-600 hover:bg-emerald-600">Admin</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Upload files here, then share the link and viewer code.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowSettings((s) => !s)}>
          <SettingsIcon className="h-4 w-4" />
          <span className="ml-1.5">Codes &amp; settings</span>
        </Button>
      </div>

      {/* Hand-out card: link + viewer code */}
      <Card className="mb-5 grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <Label className="text-xs text-muted-foreground">Share link</Label>
          <div className="mt-1 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-sm">
              <LinkIcon className="mr-1 inline h-3 w-3" />
              {session.link}
            </code>
            <CopyButton value={session.link || ""} label="Copy" />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Viewer code (give this to people)</Label>
          <div className="mt-1 flex items-center gap-2">
            <code className="rounded bg-muted px-2 py-1 font-mono text-sm tracking-widest">{session.viewerCode}</code>
            <CopyButton value={session.viewerCode || ""} label="Copy" />
          </div>
        </div>
      </Card>

      {showSettings ? <SettingsPanel session={session} onSaved={setSession} onClose={() => setShowSettings(false)} /> : null}

      {/* Files */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-3">
          <span className="text-sm font-medium">
            {files.length} file{files.length === 1 ? "" : "s"}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => handleUpload(e.target.files)}
            data-testid="input-upload"
          />
          <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} data-testid="button-upload">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            <span className="ml-1.5">Upload files</span>
          </Button>
        </div>
        {files.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No files yet — upload some to share (up to 25&nbsp;MB each).
          </p>
        ) : (
          <ul className="divide-y">
            {files.map((f) => (
              <FileRow
                key={f.id}
                file={f}
                downloadHref={`/api/files/download/${f.id}?inline=0`}
                onDelete={() => removeFile.mutate(f.id)}
              />
            ))}
          </ul>
        )}
      </Card>

      <LockButton />
    </div>
  );
}

function SettingsPanel({
  session,
  onSaved,
  onClose,
}: {
  session: FilesSession;
  onSaved: (s: FilesSession) => void;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(session.name || "");
  const [note, setNote] = useState(session.note || "");
  const [viewerCode, setViewerCode] = useState(session.viewerCode || "");
  const [adminCode, setAdminCode] = useState(session.adminCode || "");

  const save = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/files/settings", {
        name,
        note,
        viewerCode,
        adminCode,
      });
      return (await res.json()) as FilesSession;
    },
    onSuccess: (data) => {
      onSaved(data);
      toast({ title: "Saved" });
      onClose();
    },
    onError: (err: any) =>
      toast({ title: "Couldn't save", description: err?.message?.replace(/^\d+:\s*/, "") || "", variant: "destructive" }),
  });

  return (
    <Card className="mb-5 space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="set-viewer">Viewer code</Label>
          <Input id="set-viewer" value={viewerCode} onChange={(e) => setViewerCode(e.target.value)} className="mt-1.5 font-mono" />
          <p className="mt-1 text-xs text-muted-foreground">People type this to view &amp; download.</p>
        </div>
        <div>
          <Label htmlFor="set-admin">Admin code</Label>
          <Input id="set-admin" value={adminCode} onChange={(e) => setAdminCode(e.target.value)} className="mt-1.5 font-mono" />
          <p className="mt-1 text-xs text-muted-foreground">You type this to upload &amp; manage.</p>
        </div>
      </div>
      <div>
        <Label htmlFor="set-name">Title</Label>
        <Input id="set-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
      </div>
      <div>
        <Label htmlFor="set-note">Note to recipients (optional)</Label>
        <Textarea id="set-note" value={note} onChange={(e) => setNote(e.target.value)} className="mt-1.5" rows={2} />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending} data-testid="button-save-settings">
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          <span className="ml-1.5">Save</span>
        </Button>
      </div>
    </Card>
  );
}

// ── Entry — one route, three views based on the resolved role ─────────
export default function FilesPage() {
  const { data: session, isLoading } = useQuery<FilesSession>({
    queryKey: SESSION_KEY,
    queryFn: async () => {
      const res = await fetch("/api/files/session", { credentials: "include" });
      if (!res.ok) return { role: "none" };
      return res.json();
    },
    staleTime: 0,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const role = session?.role ?? "none";
  return (
    <PageShell>
      {role === "admin" ? (
        <AdminView session={session!} />
      ) : role === "viewer" ? (
        <ViewerView session={session!} />
      ) : (
        <CodeGate />
      )}
    </PageShell>
  );
}
