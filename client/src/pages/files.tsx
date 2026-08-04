import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Copy,
  Check,
  Download,
  File as FileIcon,
  FolderLock,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
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
import { useAuth } from "@/lib/auth";
import { KennionLogo } from "@/components/kennion-logo";
import { ThemeToggle } from "@/components/theme-toggle";

// ── Shared types (mirror the server's public shapes) ─────────────────
interface FileMeta {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}
interface UnlockedShare {
  share: { id: string; name: string; note: string | null };
  files: FileMeta[];
}
interface AdminShare {
  id: string;
  name: string;
  code: string;
  note: string | null;
  enabled: boolean;
  expiresAt: string | null;
  accessCount: number;
  lastAccessedAt: string | null;
  createdAt: string;
  link: string;
  files: FileMeta[];
}

function formatBytes(n: number): string {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// Small copy-to-clipboard button used for codes and links.
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
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <KennionLogo size="sm" />
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Public view — recipient enters a code, then downloads the files.
// ═══════════════════════════════════════════════════════════════════
function FilesPublic() {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [unlocked, setUnlocked] = useState<UnlockedShare[]>([]);

  // Rehydrate any shares already unlocked in this browser session.
  const { data: session, isLoading } = useQuery<{ shares: UnlockedShare[] }>({
    queryKey: ["/api/files/session"],
    queryFn: async () => {
      const res = await fetch("/api/files/session", { credentials: "include" });
      if (!res.ok) return { shares: [] };
      return res.json();
    },
    staleTime: 0,
  });

  useEffect(() => {
    if (session?.shares) setUnlocked(session.shares);
  }, [session]);

  const unlock = useMutation({
    mutationFn: async (accessCode: string) => {
      const res = await apiRequest("POST", "/api/files/access", { code: accessCode });
      return (await res.json()) as UnlockedShare;
    },
    onSuccess: (data) => {
      setUnlocked((prev) => {
        const rest = prev.filter((u) => u.share.id !== data.share.id);
        return [data, ...rest];
      });
      setCode("");
      toast({ title: "Unlocked", description: `You now have access to "${data.share.name}".` });
    },
    onError: (err: any) => {
      toast({
        title: "Access denied",
        description: err?.message?.replace(/^\d+:\s*/, "") || "That code didn't work.",
        variant: "destructive",
      });
    },
  });

  const lock = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/files/lock", {});
    },
    onSuccess: () => {
      setUnlocked([]);
      queryClient.invalidateQueries({ queryKey: ["/api/files/session"] });
    },
  });

  return (
    <PageShell>
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FolderLock className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Secure Files</h1>
            <p className="text-sm text-muted-foreground">Enter the access code you were sent to view your documents.</p>
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
                placeholder="e.g. ABCD2345"
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

        {isLoading ? (
          <div className="mt-8 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : null}

        {unlocked.map((u) => (
          <Card key={u.share.id} className="mt-6 overflow-hidden">
            <div className="border-b bg-muted/40 px-5 py-4">
              <h2 className="font-semibold">{u.share.name}</h2>
              {u.share.note ? <p className="mt-1 text-sm text-muted-foreground">{u.share.note}</p> : null}
            </div>
            {u.files.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">No files have been added yet.</p>
            ) : (
              <ul className="divide-y">
                {u.files.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <FileIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{f.fileName}</p>
                        <p className="text-xs text-muted-foreground">{formatBytes(f.sizeBytes)}</p>
                      </div>
                    </div>
                    <a href={`/api/files/download/${f.id}`} data-testid={`link-download-${f.id}`}>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" />
                        <span className="ml-1.5 hidden sm:inline">Download</span>
                      </Button>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}

        {unlocked.length > 0 ? (
          <div className="mt-6 text-center">
            <Button variant="ghost" size="sm" onClick={() => lock.mutate()} disabled={lock.isPending}>
              <Lock className="h-4 w-4" />
              <span className="ml-1.5">Lock &amp; sign out of files</span>
            </Button>
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Admin view — create shares, upload files, hand out codes + link.
// ═══════════════════════════════════════════════════════════════════
function ShareCard({ share }: { share: AdminShare }) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/files/shares"] });

  const patch = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await apiRequest("PATCH", `/api/admin/files/shares/${share.id}`, body);
      return res.json();
    },
    onSuccess: () => invalidate(),
    onError: (err: any) =>
      toast({ title: "Update failed", description: err?.message?.replace(/^\d+:\s*/, "") || "", variant: "destructive" }),
  });

  const removeShare = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/admin/files/shares/${share.id}`);
    },
    onSuccess: () => {
      toast({ title: "Share deleted" });
      invalidate();
    },
  });

  const removeFile = useMutation({
    mutationFn: async (fileId: string) => {
      await apiRequest("DELETE", `/api/admin/files/${fileId}`);
    },
    onSuccess: () => invalidate(),
  });

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("files", f));
    setUploading(true);
    try {
      const res = await fetch(`/api/admin/files/shares/${share.id}/files`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) {
        const msg = (await res.json().catch(() => ({}))).message || "Upload failed";
        throw new Error(msg);
      }
      toast({ title: "Uploaded", description: `${files.length} file(s) added.` });
      invalidate();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err?.message || "", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const expired = share.expiresAt ? new Date(share.expiresAt).getTime() < Date.now() : false;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/40 px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold">{share.name}</h3>
            {!share.enabled ? (
              <Badge variant="secondary">Disabled</Badge>
            ) : expired ? (
              <Badge variant="destructive">Expired</Badge>
            ) : (
              <Badge className="bg-emerald-600 hover:bg-emerald-600">Active</Badge>
            )}
          </div>
          {share.note ? <p className="mt-1 text-sm text-muted-foreground">{share.note}</p> : null}
          <p className="mt-1 text-xs text-muted-foreground">
            {share.files.length} file{share.files.length === 1 ? "" : "s"} · {share.accessCount} unlock
            {share.accessCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Enabled</span>
            <Switch checked={share.enabled} onCheckedChange={(v) => patch.mutate({ enabled: v })} />
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive" data-testid={`button-delete-share-${share.id}`}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this share?</AlertDialogTitle>
                <AlertDialogDescription>
                  "{share.name}" and its {share.files.length} file(s) will be permanently removed. The access code will stop
                  working immediately.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => removeShare.mutate()}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Code + link to hand out */}
      <div className="grid gap-3 px-5 py-4 sm:grid-cols-2">
        <div>
          <Label className="text-xs text-muted-foreground">Access code</Label>
          <div className="mt-1 flex items-center gap-2">
            <code className="rounded bg-muted px-2 py-1 font-mono text-sm tracking-widest">{share.code}</code>
            <CopyButton value={share.code} label="Copy" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => patch.mutate({ regenerateCode: true })}
              title="Generate a new code"
              data-testid={`button-regen-${share.id}`}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Share link</Label>
          <div className="mt-1 flex items-center gap-2">
            <code className="truncate rounded bg-muted px-2 py-1 text-sm">
              <LinkIcon className="mr-1 inline h-3 w-3" />
              {share.link}
            </code>
            <CopyButton value={share.link} label="Copy" />
          </div>
        </div>
      </div>

      {/* Files */}
      <div className="border-t px-5 py-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">Files</span>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => handleUpload(e.target.files)}
            data-testid={`input-upload-${share.id}`}
          />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            <span className="ml-1.5">Upload files</span>
          </Button>
        </div>
        {share.files.length === 0 ? (
          <p className="py-3 text-sm text-muted-foreground">No files yet — upload some to share (up to 25&nbsp;MB each).</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {share.files.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm">{f.fileName}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(f.sizeBytes)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <a href={`/api/admin/files/${f.id}/download`}>
                    <Button variant="ghost" size="icon" title="Download">
                      <Download className="h-4 w-4" />
                    </Button>
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => removeFile.mutate(f.id)}
                    title="Remove file"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function FilesAdmin() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [note, setNote] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery<{ shares: AdminShare[] }>({
    queryKey: ["/api/admin/files/shares"],
    queryFn: async () => {
      const res = await fetch("/api/admin/files/shares", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load shares");
      return res.json();
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { name: name.trim() };
      if (customCode.trim()) body.code = customCode.trim();
      if (note.trim()) body.note = note.trim();
      const res = await apiRequest("POST", "/api/admin/files/shares", body);
      return res.json();
    },
    onSuccess: () => {
      setName("");
      setCustomCode("");
      setNote("");
      setShowCreate(false);
      toast({ title: "Share created", description: "Upload files, then send the link and code." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/files/shares"] });
    },
    onError: (err: any) =>
      toast({ title: "Couldn't create share", description: err?.message?.replace(/^\d+:\s*/, "") || "", variant: "destructive" }),
  });

  const shares = data?.shares ?? [];

  return (
    <PageShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FolderLock className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Secure Files</h1>
            <p className="text-sm text-muted-foreground">
              Create a share, upload documents, then send someone the link and code.
            </p>
          </div>
        </div>
        <Button onClick={() => setShowCreate((s) => !s)} data-testid="button-new-share">
          <Plus className="h-4 w-4" />
          <span className="ml-1.5">New share</span>
        </Button>
      </div>

      {showCreate ? (
        <Card className="mb-6 p-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) create.mutate();
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="share-name">Name</Label>
              <Input
                id="share-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Documents for Acme Corp"
                className="mt-1.5"
                data-testid="input-share-name"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="share-code">Access code (optional)</Label>
                <Input
                  id="share-code"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value)}
                  placeholder="Leave blank to auto-generate"
                  className="mt-1.5 font-mono"
                  data-testid="input-share-code"
                />
                <p className="mt-1 text-xs text-muted-foreground">Recipients type this to unlock. Auto-generated if blank.</p>
              </div>
              <div>
                <Label htmlFor="share-note">Note to recipient (optional)</Label>
                <Textarea
                  id="share-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Shown once they unlock"
                  className="mt-1.5 min-h-[38px]"
                  rows={1}
                  data-testid="input-share-note"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending || !name.trim()} data-testid="button-create-share">
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                <span className="ml-1.5">Create share</span>
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : shares.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <FolderLock className="h-10 w-10 text-muted-foreground/50" />
          <p className="font-medium">No shares yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Create your first share to start sending secure files. Each share gets its own access code that you hand out with
            the link.
          </p>
        </Card>
      ) : (
        <div className="space-y-5">
          {shares.map((s) => (
            <ShareCard key={s.id} share={s} />
          ))}
        </div>
      )}
    </PageShell>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Entry — the single /files route decides which view to show. Admins
// get the manager; everyone else gets the code gate. This is why the
// one link (www.kennion.com/files) works for both.
// ═══════════════════════════════════════════════════════════════════
export default function FilesPage() {
  const { user, isLoading } = useAuth();
  const isAdmin = useMemo(() => user?.role === "admin", [user]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  return isAdmin ? <FilesAdmin /> : <FilesPublic />;
}
