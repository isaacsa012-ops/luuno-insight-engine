import { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, Sparkles, X } from "lucide-react";
import { askAssistant, type AssistantMessage } from "@/lib/assistant";
import { useStore } from "@/lib/store";
import { priorityScore, nextAction } from "@/lib/scoring";
import { cn } from "@/lib/utils";

/**
 * The Luuno Agent — a floating chat available on every screen. Workspace-
 * scoped: it carries a live summary of the whole pipeline (every prospect's
 * status, tier, value and next action), so it can brief, prioritise and plan
 * from anywhere. Deep single-company questions belong to the Analyst tab
 * inside that prospect, which holds the full record.
 *
 * Opens from the bubble or from anywhere via:
 *   window.dispatchEvent(new Event("luuno-agent:open"))
 */

const OPEN_EVENT = "luuno-agent:open";

export function openLuunoAgent() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function LuunoAgent() {
  const { prospects, settings } = useStore();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  const workspaceSummary = () =>
    prospects
      .map((p) => {
        const pr = priorityScore(p);
        const act = nextAction(p);
        return `- ${p.company} (${p.industry || "industry n/a"}) · status=${p.status} · tier=${pr.tier} score=${pr.score} · value=$${p.opportunityValue} · owner=${p.owner || "unknown"} · next: ${act.label} · whyNow: ${(p.whyNowNarrative || "n/a").split("\n")[0].slice(0, 90)}`;
      })
      .slice(0, 50)
      .join("\n") || "No prospects in the workspace yet.";

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
          workspaceSummary: workspaceSummary(),
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
        { role: "assistant", content: "Something went wrong reaching the agent. Try again." },
      ]);
    } finally {
      setBusy(false);
      requestAnimationFrame(() =>
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }),
      );
    }
  };

  return (
    <>
      {/* Bubble */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open Luuno Agent"
        className={cn(
          "fixed right-5 bottom-5 z-50 flex h-12 w-12 items-center justify-center rounded-full border transition-all",
          open
            ? "border-border bg-surface text-muted-foreground"
            : "border-foreground bg-foreground text-background hover:scale-105",
        )}
      >
        {open ? <X className="h-4.5 w-4.5" /> : <Sparkles className="h-4.5 w-4.5" />}
      </button>

      {/* Panel */}
      {open ? (
        <div className="fixed right-5 bottom-20 z-50 flex h-[min(560px,calc(100dvh-120px))] w-[min(400px,calc(100vw-40px))] flex-col overflow-hidden rounded-[14px] border border-border bg-background shadow-2xl">
          <div className="border-b border-border px-4 py-3">
            <p className="text-[13px] font-semibold tracking-tight">Luuno Agent</p>
            <p className="mt-0.5 text-[11px] text-subtle">
              Sees the whole pipeline · {prospects.length} prospect{prospects.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-2.5">
            {[
              ["Today's plan", "Given every prospect's state, what should I work on today, in order? Keep it to the top 3 with one-line reasons."],
              ["Pipeline brief", "Brief me on the pipeline in under 120 words: totals by tier, what's moving, what's stalled, biggest risk."],
              ["Follow-ups due", "Which prospects most urgently need a follow-up or are going stale, and what's the one-line move for each?"],
            ].map(([label, prompt]) => (
              <button
                key={label}
                type="button"
                disabled={busy}
                onClick={() => send(prompt)}
                className="rounded-[7px] border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground disabled:opacity-40"
              >
                {label}
              </button>
            ))}
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 ? (
              <p className="text-[12px] leading-relaxed text-subtle">
                Ask about the pipeline, priorities, or anything you're working on. For deep
                questions on one company, its Analyst tab knows the full record.
              </p>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "max-w-[94%] rounded-[10px] px-3.5 py-2.5 text-[12.5px] leading-relaxed whitespace-pre-wrap",
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
            className="flex items-end gap-2 border-t border-border px-3 py-2.5"
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
              rows={1}
              placeholder="Ask the agent…"
              className="max-h-[96px] min-h-[38px] flex-1 resize-none rounded-[9px] border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none placeholder:text-subtle focus:border-border-strong"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[9px] bg-foreground text-background transition-opacity disabled:opacity-40"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
