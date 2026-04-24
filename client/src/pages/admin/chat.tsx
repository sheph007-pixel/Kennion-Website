import { useState } from "react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bot,
  Edit,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Trash2,
  User as UserIcon,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ProposalNav } from "@/components/proposal/proposal-nav";
import { cn } from "@/lib/utils";
import type { ChatMessage, ChatRule } from "@shared/schema";

// Admin screen for the dashboard chat assistant. Two tabs:
//   Transcripts — every conversation users have had with the assistant,
//                 grouped by conversationId. Click to see the full
//                 exchange. Read-only — the point is to spot where the
//                 assistant is weak and fix it via the Rules tab.
//   Rules       — admin-authored instructions appended to the system
//                 prompt on every chat request. Enable/disable without
//                 deleting so experiments are cheap.
export default function AdminChatPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <ProposalNav />
      <div className="mx-auto max-w-[1100px] px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate("/admin")}
              className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              data-testid="back-to-admin"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Admin home
            </button>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard assistant</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse chat transcripts and tune the assistant's behaviour.
            </p>
          </div>
        </div>

        <Tabs defaultValue="transcripts" className="w-full">
          <TabsList>
            <TabsTrigger value="transcripts">
              <MessageSquare className="mr-1.5 h-4 w-4" />
              Transcripts
            </TabsTrigger>
            <TabsTrigger value="rules">
              <Bot className="mr-1.5 h-4 w-4" />
              Rules
            </TabsTrigger>
          </TabsList>
          <TabsContent value="transcripts" className="mt-4">
            <TranscriptsTab />
          </TabsContent>
          <TabsContent value="rules" className="mt-4">
            <RulesTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ─── Transcripts tab ────────────────────────────────────────────────────

type ConversationSummary = {
  conversationId: string;
  userId: string;
  groupId: string | null;
  messageCount: number;
  firstAt: string;
  lastAt: string;
  firstUserMessage: string | null;
  userEmail: string | null;
  userName: string | null;
  companyName: string | null;
};

function TranscriptsTab() {
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: conversations, isLoading } = useQuery<ConversationSummary[]>({
    queryKey: ["/api/admin/chat/conversations"],
  });

  if (isLoading) {
    return (
      <Card className="flex items-center justify-center p-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  const rows = conversations ?? [];

  if (rows.length === 0) {
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground">
        No chat conversations yet. They'll appear here as soon as anyone uses the
        assistant on their dashboard.
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Group</th>
              <th className="px-4 py-3">First question</th>
              <th className="px-4 py-3 text-right">Turns</th>
              <th className="px-4 py-3">Last activity</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((c) => (
              <tr key={c.conversationId} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="font-medium">{c.userName || "—"}</div>
                  <div className="text-xs text-muted-foreground">{c.userEmail || c.userId.slice(0, 8)}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{c.companyName || "—"}</td>
                <td className="max-w-sm truncate px-4 py-3 text-muted-foreground">
                  {c.firstUserMessage || <span className="italic opacity-60">(no user message)</span>}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{c.messageCount}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {format(new Date(c.lastAt), "MMM d, yyyy h:mm a")}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setOpenId(c.conversationId)}
                    data-testid={`view-transcript-${c.conversationId}`}
                  >
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {openId && <TranscriptDialog id={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}

type TranscriptResponse = {
  conversationId: string;
  user: { id: string; email: string; fullName: string } | null;
  group: { id: string; companyName: string } | null;
  messages: ChatMessage[];
};

function TranscriptDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading } = useQuery<TranscriptResponse>({
    queryKey: [`/api/admin/chat/conversations/${id}`],
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Conversation transcript</DialogTitle>
          <DialogDescription>
            {data?.user
              ? `${data.user.fullName || data.user.email}${data.group ? ` • ${data.group.companyName}` : ""}`
              : "Loading…"}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-2">
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {data?.messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "rounded-md border px-3 py-2 text-sm leading-relaxed",
                m.role === "user"
                  ? "border-primary/30 bg-primary/5"
                  : "border-muted-foreground/20 bg-muted/30",
              )}
            >
              <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {m.role === "user" ? <UserIcon className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                {m.role}
                <span className="ml-auto font-normal normal-case tracking-normal">
                  {format(new Date(m.createdAt), "MMM d, h:mm:ss a")}
                </span>
              </div>
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Rules tab ──────────────────────────────────────────────────────────

function RulesTab() {
  const { toast } = useToast();
  const [editing, setEditing] = useState<ChatRule | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ChatRule | null>(null);

  const { data: rules, isLoading } = useQuery<ChatRule[]>({
    queryKey: ["/api/admin/chat/rules"],
  });

  const toggleEnabled = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/chat/rules/${id}`, { enabled });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chat/rules"] });
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/chat/rules/${id}`);
    },
    onSuccess: () => {
      setConfirmDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chat/rules"] });
      toast({ title: "Rule deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <>
      <div className="mb-4 flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Rules are appended to the assistant's system prompt on every chat.
          Use them to correct wrong answers, add facts, or nudge tone. Enable
          one to ship it live; disable to A/B without deleting.
        </p>
        <Button onClick={() => setCreating(true)} data-testid="new-rule">
          <Plus className="mr-1.5 h-4 w-4" />
          New rule
        </Button>
      </div>

      {isLoading ? (
        <Card className="flex items-center justify-center p-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </Card>
      ) : (rules ?? []).length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No rules yet. Click <strong>New rule</strong> to add one. Examples: "If
          a user asks about dental orthodontic coverage, tell them to call
          Hunter." or "Always mention that virtual care is included on every
          plan when describing benefits."
        </Card>
      ) : (
        <div className="space-y-3">
          {rules!.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start gap-4">
                <Switch
                  checked={r.enabled}
                  onCheckedChange={(enabled) => toggleEnabled.mutate({ id: r.id, enabled })}
                  aria-label={`Toggle rule ${r.label}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold">{r.label}</div>
                    {!r.enabled && <Badge variant="secondary">disabled</Badge>}
                  </div>
                  <div className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {r.content}
                  </div>
                  <div className="mt-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    Updated {format(new Date(r.updatedAt), "MMM d, yyyy h:mm a")}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setEditing(r)} aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setConfirmDelete(r)}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {creating && <RuleDialog onClose={() => setCreating(false)} />}
      {editing && <RuleDialog rule={editing} onClose={() => setEditing(null)} />}

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete rule?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDelete?.label}" — this will take effect on the next chat request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && deleteRule.mutate(confirmDelete.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function RuleDialog({ rule, onClose }: { rule?: ChatRule; onClose: () => void }) {
  const { toast } = useToast();
  const isEdit = !!rule;
  const [label, setLabel] = useState(rule?.label ?? "");
  const [content, setContent] = useState(rule?.content ?? "");
  const [enabled, setEnabled] = useState(rule?.enabled ?? true);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { label: label.trim(), content: content.trim(), enabled };
      if (isEdit) {
        const res = await apiRequest("PATCH", `/api/admin/chat/rules/${rule!.id}`, payload);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/admin/chat/rules", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chat/rules"] });
      toast({ title: isEdit ? "Rule updated" : "Rule added" });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit rule" : "New rule"}</DialogTitle>
          <DialogDescription>
            Short label for your own reference; the rule content is what the
            assistant sees.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold">Label</label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. HSA plan guidance"
              maxLength={120}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">Rule</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="e.g. When asked about the Saver HSA plan, mention that deductibles and copays apply only after the deductible is met, since it's HDHP-qualified."
              className="min-h-[140px]"
              maxLength={4000}
            />
            <div className="mt-1 text-right text-[10px] text-muted-foreground">
              {content.length}/4000
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={enabled} onCheckedChange={setEnabled} id="rule-enabled" />
            <label htmlFor="rule-enabled" className="text-sm">
              Enabled
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending || !label.trim() || !content.trim()}
          >
            {save.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            {isEdit ? "Save changes" : "Add rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
