import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// Dashboard chat widget — floating button bottom-right that opens a side
// sheet. Talks to POST /api/chat (SSE stream). History is ephemeral
// (local state only); closing the sheet keeps state but a page refresh
// clears it.

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatWidgetProps {
  // When provided, the server loads this group's rates into the prompt
  // so the assistant can answer "what's my EE rate for …?"-style
  // questions. Undefined for pre-group states (no census uploaded yet).
  groupId?: string;
}

const STARTER = "Hi! I'm the Kennion plan assistant. Ask me about your plan benefits, rates, or how the program works.";
const MAX_CHARS = 1000;

export function ChatWidget({ groupId }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: STARTER },
  ]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Auto-scroll to the latest message whenever content grows.
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  async function sendMessage() {
    const text = input.trim();
    if (!text || streaming) return;
    setError(null);
    setInput("");

    const nextHistory: ChatMessage[] = [
      ...messages,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ];
    setMessages(nextHistory);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: controller.signal,
        body: JSON.stringify({
          message: text,
          groupId,
          // Send everything except the just-added empty assistant stub.
          history: nextHistory.slice(0, -1),
        }),
      });

      if (!res.ok) {
        let msg = `Request failed (${res.status}).`;
        try {
          const j = await res.json();
          if (j?.message) msg = j.message;
        } catch {
          // non-JSON body — keep the generic message
        }
        throw new Error(msg);
      }
      if (!res.body) throw new Error("No response stream.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE frames separated by blank lines.
        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) >= 0) {
          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          handleSseFrame(frame);
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setError(msg);
      // Drop the empty assistant bubble we added optimistically.
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === "assistant" && last.content === "") return prev.slice(0, -1);
        return prev;
      });
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function handleSseFrame(frame: string) {
    let event = "message";
    let data = "";
    for (const line of frame.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data += line.slice(5).trim();
    }
    if (!data) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }
    if (event === "token") {
      const text = (parsed as { text?: string }).text ?? "";
      setMessages((prev) => {
        const next = prev.slice();
        const last = next[next.length - 1];
        if (last && last.role === "assistant") {
          next[next.length - 1] = { ...last, content: last.content + text };
        }
        return next;
      });
    } else if (event === "error") {
      const msg = (parsed as { message?: string }).message ?? "Stream error.";
      setError(msg);
    }
    // "done" — nothing extra to do; loop exits on reader done.
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <>
      {/* Floating launcher — bottom-right, fixed to the viewport.
          Uses a raw <button> (not the shadcn Button wrapper) so the
          app's `.hover-elevate` rule — which forces position: relative
          via :not() and outranks Tailwind's `.fixed` utility on
          specificity — doesn't demote this element into normal
          document flow. */}
      <button
        type="button"
        aria-label="Open Kennion plan assistant"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-shadow hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        data-testid="chat-widget-launcher"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col p-0 sm:max-w-md"
        >
          <SheetHeader className="border-b px-5 pb-4 pt-5">
            <SheetTitle>Plan assistant</SheetTitle>
            <SheetDescription className="text-xs">
              Ask about your plans, benefits, or rates. Answers are for
              informational purposes and are subject to underwriting and
              final enrollment.
            </SheetDescription>
          </SheetHeader>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {messages.map((m, i) => (
              <MessageBubble key={i} role={m.role} content={m.content} pending={streaming && i === messages.length - 1 && m.role === "assistant" && m.content === ""} />
            ))}
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}
          </div>

          <div className="border-t px-4 py-3">
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
                onKeyDown={onKeyDown}
                placeholder="Ask about your plans or rates…"
                className="min-h-[44px] max-h-32 resize-none text-sm"
                disabled={streaming}
                data-testid="chat-widget-input"
              />
              <Button
                onClick={sendMessage}
                disabled={streaming || input.trim().length === 0}
                size="icon"
                aria-label="Send message"
                data-testid="chat-widget-send"
              >
                {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <div className="mt-1 text-right text-[10px] text-muted-foreground">
              {input.length}/{MAX_CHARS}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function MessageBubble({ role, content, pending }: { role: "user" | "assistant"; content: string; pending?: boolean }) {
  const mine = role === "user";
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed",
          mine
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        )}
      >
        {pending ? (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Thinking…
          </span>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
