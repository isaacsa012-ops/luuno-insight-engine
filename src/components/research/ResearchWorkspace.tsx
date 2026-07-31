import { useState } from "react";
import { Check, ClipboardCopy, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Panel, PanelHeader, Meter } from "@/components/kit/Panel";
import { EditableText } from "@/components/kit/Editable";
import {
  RESEARCH_SPEC,
  applyParsedResearch,
  buildResearchPrompt,
  parseResearchResponse,
  researchFieldCount,
} from "@/lib/research";
import { currency } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Prospect, ResearchSection } from "@/lib/types";

/**
 * AI-ready research capture.
 *
 * The copy-prompt → paste-response → parse loop is deliberately isolated in
 * `@/lib/research`, so replacing it with a direct API call later means swapping
 * one function, not rewriting this workspace.
 */
export function ResearchWorkspace({ prospect }: { prospect: Prospect }) {
  const { updateProspect, addTimelineEvent, logActivity } = useStore();
  const [response, setResponse] = useState("");
  const [copied, setCopied] = useState(false);

  const prompt = buildResearchPrompt(prospect);

  const valueOf = (key: (typeof RESEARCH_SPEC)[number]["key"]): string => {
    if (key === "internalNotes") return prospect.notes;
    if (key === "whyNow") return prospect.whyNowNarrative;
    if (key === "opportunityValue") return String(prospect.opportunityValue);
    return prospect.research[key as keyof ResearchSection];
  };

  const setValue = (key: (typeof RESEARCH_SPEC)[number]["key"], next: string) => {
    if (key === "internalNotes") return updateProspect(prospect.id, { notes: next });
    if (key === "whyNow") return updateProspect(prospect.id, { whyNowNarrative: next });
    if (key === "opportunityValue")
      return updateProspect(prospect.id, {
        opportunityValue: Number(next.replace(/[^0-9]/g, "")) || 0,
      });
    return updateProspect(prospect.id, {
      research: { ...prospect.research, [key]: next },
    });
  };

  const completed = RESEARCH_SPEC.filter((s) => valueOf(s.key).trim() && valueOf(s.key) !== "0").length;
  const completion = Math.round((completed / RESEARCH_SPEC.length) * 100);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Research prompt copied");
    } catch {
      toast.error("Clipboard unavailable — select the prompt and copy manually");
    }
  };

  const parse = () => {
    const parsed = parseResearchResponse(response);
    const count = researchFieldCount(parsed);
    if (!count) {
      toast.error("No structured sections found. Keep the ## headings intact.");
      return;
    }
    updateProspect(prospect.id, applyParsedResearch(prospect, parsed));
    addTimelineEvent(prospect.id, {
      kind: "note",
      label: "Research populated",
      detail: `${count} sections parsed from structured response.`,
    });
    logActivity(prospect.id, "Research populated");
    setResponse("");
    toast.success(`${count} research sections populated`);
  };

  return (
    <div className="space-y-6">
      <Panel className="border-border-strong">
        <PanelHeader
          title="Research Completion"
          description="Every section below is editable at any time. Completion drives the intelligence score."
          action={
            <span className="text-[18px] font-semibold tabular-nums">{completion}%</span>
          }
        />
        <div className="px-5 py-5">
          <Meter value={completion} />
          <p className="mt-3 text-[12px] text-subtle">
            {completed} of {RESEARCH_SPEC.length} sections documented · Estimated opportunity{" "}
            {currency(prospect.opportunityValue, true)}
          </p>
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title="AI-Ready Research"
          description="Copy the prompt, run it in Claude, paste the structured response back and parse it into fields."
          action={
            <button
              type="button"
              onClick={copyPrompt}
              className="inline-flex h-8 items-center gap-2 rounded-[8px] bg-foreground px-3 text-[12px] font-medium text-background"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy Prompt"}
            </button>
          }
        />
        <div className="grid grid-cols-1 gap-px bg-border lg:grid-cols-2">
          <div className="bg-surface px-5 py-4">
            <p className="label-caps">Research Prompt</p>
            <pre className="mt-3 max-h-[280px] overflow-auto rounded-[8px] border border-border bg-background p-3 text-[11px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
              {prompt}
            </pre>
          </div>
          <div className="bg-surface px-5 py-4">
            <p className="label-caps">Paste Claude Response</p>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={12}
              placeholder="Paste the full structured response here, keeping the ## headings."
              className="mt-3 w-full resize-y rounded-[8px] border border-border bg-background p-3 text-[12px] leading-relaxed text-foreground outline-none focus:border-border-strong"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-[11px] text-subtle">
                <Sparkles className="mr-1 inline h-3 w-3" />
                Parsing overwrites only the sections present in the response.
              </p>
              <button
                type="button"
                onClick={parse}
                disabled={!response.trim()}
                className="inline-flex h-8 shrink-0 items-center gap-2 rounded-[8px] border border-border px-3 text-[12px] text-muted-foreground transition-colors enabled:hover:border-border-strong enabled:hover:text-foreground disabled:opacity-40"
              >
                <Wand2 className="h-3.5 w-3.5" /> Parse Into Fields
              </button>
            </div>
          </div>
        </div>
      </Panel>

      {RESEARCH_SPEC.map((spec) => (
        <Panel key={spec.key}>
          <PanelHeader title={spec.label} description={spec.hint} />
          <div className="px-5 py-4">
            {spec.key === "opportunityValue" ? (
              <div className="flex items-baseline gap-3">
                <EditableText value={valueOf(spec.key)} onChange={(v) => setValue(spec.key, v)} />
                <span className="shrink-0 text-[12px] text-subtle">
                  {currency(prospect.opportunityValue)}
                </span>
              </div>
            ) : (
              <EditableText
                multiline
                rows={spec.rows}
                value={valueOf(spec.key)}
                onChange={(v) => setValue(spec.key, v)}
              />
            )}
          </div>
        </Panel>
      ))}
    </div>
  );
}
