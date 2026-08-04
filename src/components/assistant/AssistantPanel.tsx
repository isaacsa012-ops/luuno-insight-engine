import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUp, FileDown, ListChecks, Loader2, MessageSquareText, Video } from "lucide-react";
import { Panel, PanelHeader } from "@/components/kit/Panel";
import { askAssistant, type AssistantMessage } from "@/lib/assistant";
import { useStore } from "@/lib/store";
import type { Prospect } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * In-dashboard analyst for the open prospect. Quick actions are canned
 * prompts against the same chat; command buttons are plain app actions.
 * Conversation lives in component state only — it is a working surface,
 * not a record, and nothing here syncs to the shared workspace.
 */

const QUICK_ACTIONS: { label: string; prompt: string }[] = [
  {
    label: "Brief me",
    prompt:
      "Brief me on this prospect in under 150 words: who they are, the single strongest finding, the why-now, and the one thing to verify before sending.",
  },
  {
    label: "Video script",
    prompt:
      "Draft the 90-second custom middle section of the outreach video for this prospect: what I say and what I show on screen, beat by beat, grounded only in the record's evidence. Conversational, no hype.",
  },
  {
    label: "Next move",
    prompt:
      "Given the pipeline state, what is the single highest-value next action for this prospect, and why? One action, not a list.",
  },
  {
    label: "Objections",
    prompt:
      "List the 3 most likely objections this specific prospect will raise, each with a one-line evidence-grounded response in Luuno's voice.",
  },
];

export function AssistantPanel({ prospect }: { prospect: Prospect }) {
  const { settings } = useStore();
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = async (content: string) => {
    const text = content.trim();
    if (!text || busy) return;
    const next: AssistantMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const result = await askAssistant({
        data: {
          messages: next,
          prospect,
          settings: {
            senderName: settings.senderName,
            senderCompany: settings.senderCompany,
            bookingUrl: settings.bookingUrl,
            websiteUrl: settings.websiteUrl,
          },
        },
      });
      setMessages([...next, { role: "assistant", content: result.text }]);
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "Something went wrong reaching the assistant. Try again." },
      ]);
    } finally {
      setBusy(false);
      requestAnimationFrame(() =>
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }),
      );
    }
  };

  return (
    <Panel>
      <PanelHeader
        title="Analyst"
        description={`Knows everything in ${prospect.company}'s record. Conversation is per-session and stays out of the shared workspace.`}
        action={
          <Link
            to="/report/$prospectId"
            params={{ prospectId: prospect.id }}
            className="inline-flex items-center gap-1.5 rounded-[8px] border border-border px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
          >
            <FileDown className="h-3 w-3" /> Report
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2 border-b border-border px-5 py-3">
        {QUICK_ACTIONS.map((a) => (
          <button
            key={a.label}
            type="button"
            disabled={busy}
            onClick={() => send(a.prompt)}
            className="inline-flex items-center gap-1.5 rounded-[8px] border border-border px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground disabled:opacity-40"
          >
            {a.label === "Brief me" && <MessageSquareText className="h-3 w-3" />}
            {a.label === "Video script" && <Video className="h-3 w-3" />}
            {a.label === "Next move" && <ListChecks className="h-3 w-3" />}
            {a.label}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="h-[380px] space-y-4 overflow-y-auto px-5 py-4">
        {messages.length === 0 ? (
          <p className="text-[12px] leading-relaxed text-subtle">
            Ask anything about {prospect.company} — or hit a quick action. Everything is answered
            from the parsed research, the audit, and the pipeline state.
          </p>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[92%] rounded-[10px] px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap",
                m.role === "user"
                  ? "ml-auto bg-foreground text-background"
                  : "border border-border bg-surface text-muted-foreground",
              )}
            >
              {m.content}
            </div>
          ))
        )}
        {busy ? (
          <div className="flex items-center gap-2 text-[12px] text-subtle">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Working…
          </div>
        ) : null}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex items-end gap-2 border-t border-border px-5 py-3"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          rows={2}
          placeholder={`Ask about ${prospect.company}…`}
          className="min-h-[44px] flex-1 resize-none rounded-[10px] border border-border bg-background px-3.5 py-2.5 text-[13px] text-foreground outline-none placeholder:text-subtle focus:border-border-strong"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[10px] bg-foreground text-background transition-opacity disabled:opacity-40"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </form>
    </Panel>
  );
}
