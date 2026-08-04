import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, ClipboardCopy, FileDown, FileText, Paperclip, Play, Settings2 } from "lucide-react";
import { Panel, PanelHeader } from "@/components/kit/Panel";
import { EditableText } from "@/components/kit/Editable";
import { useStore } from "@/lib/store";
import { intelligenceScore } from "@/lib/scoring";
import { DEFAULT_EMAIL_TEMPLATE, buildOutreachEmail } from "@/lib/research";
import { toast } from "sonner";
import type { Prospect } from "@/lib/types";

/**
 * Review surface, not a sender. Renders exactly what the recipient will see so
 * the operator can approve the artefact before it leaves the building.
 */
export function EmailPreview({ prospect }: { prospect: Prospect }) {
  const { settings, updateProspect, updateSettings } = useStore();
  const [copied, setCopied] = useState<"subject" | "body" | null>(null);
  const [editingTemplate, setEditingTemplate] = useState(false);
  const firstName = (prospect.owner || "there").split(/\s+/)[0];
  const { subject, body } = buildOutreachEmail(prospect, settings);
  const score = intelligenceScore(prospect);

  const copy = async (kind: "subject" | "body") => {
    try {
      await navigator.clipboard.writeText(kind === "subject" ? subject : body);
      setCopied(kind);
      toast.success(kind === "subject" ? "Subject copied" : "Email body copied — paste into Gmail");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Couldn't reach the clipboard");
    }
  };

  const bottleneck =
    prospect.research.bottlenecks.split("\n").find((l) => l.trim())?.replace(/^\d+[.)]\s*/, "") ??
    "a coordination step that is still handled by hand";

  return (
    <Panel>
      <PanelHeader
        title="Outreach Preview"
        description="Exactly what the recipient receives. Nothing is sent from this screen."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => copy("subject")}
              className="inline-flex items-center gap-1.5 rounded-[8px] border border-border px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
            >
              {copied === "subject" ? <Check className="h-3 w-3" /> : <ClipboardCopy className="h-3 w-3" />}
              Subject
            </button>
            <button
              type="button"
              onClick={() => copy("body")}
              className="inline-flex items-center gap-1.5 rounded-[8px] bg-foreground px-2.5 py-1.5 text-[11px] font-medium text-background transition-colors hover:bg-foreground/90"
            >
              {copied === "body" ? <Check className="h-3 w-3" /> : <ClipboardCopy className="h-3 w-3" />}
              Copy email
            </button>
            <span className="text-[11px] text-subtle">
              {prospect.pipeline.email_sent ? "Sent" : "Draft"}
            </span>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2">
        <div className="bg-surface px-5 py-3">
          <p className="label-caps">Recipient</p>
          <p className="mt-1 truncate text-[13px] text-muted-foreground">
            {prospect.owner || "Unknown"} · {prospect.email || "no email recorded"}
          </p>
        </div>
        <div className="bg-surface px-5 py-3">
          <p className="label-caps">Subject</p>
          <p className="mt-1 truncate text-[13px] text-foreground">{subject}</p>
        </div>
      </div>

      <div className="p-5">
        <article className="rounded-[10px] border border-border-strong bg-background p-6">
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground first-line:text-foreground">
            {body}
          </p>

          <div className="mt-6 grid grid-cols-[132px_minmax(0,1fr)] gap-4 rounded-[10px] border border-border p-3">
            <div className="relative flex h-[74px] items-center justify-center rounded-[8px] border border-border bg-surface-raised">
              <Play className="h-5 w-5 text-foreground" strokeWidth={1.5} />
              <span className="absolute bottom-1.5 right-2 text-[10px] tabular-nums text-subtle">
                4:12
              </span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-medium text-foreground">
                Personalised audit walkthrough
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-subtle">
                {prospect.company} · recorded for {firstName}
                {prospect.pipeline.video_recorded ? "" : " · not recorded yet"}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-[8px] border border-border px-3 py-2">
            <Paperclip className="h-3.5 w-3.5 shrink-0 text-subtle" />
            <span className="min-w-0 flex-1 truncate text-[12px] text-muted-foreground">
              {prospect.company.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-systems-audit.pdf
            </span>
            <span className="shrink-0 text-[11px] text-subtle">
              {prospect.pipeline.pdf_attached ? "Attached" : "Not attached"}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              to="/report/$prospectId"
              params={{ prospectId: prospect.id }}
              className="inline-flex items-center gap-2 rounded-[8px] bg-foreground px-3 py-2 text-[12px] font-medium text-background transition-colors hover:bg-foreground/90"
            >
              <FileDown className="h-3.5 w-3.5" /> Open report → Export PDF
            </Link>
            <button
              type="button"
              onClick={() =>
                updateProspect(prospect.id, {
                  pipeline: { ...prospect.pipeline, pdf_attached: !prospect.pipeline.pdf_attached },
                })
              }
              className="inline-flex items-center gap-2 rounded-[8px] border border-border px-3 py-2 text-[12px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
            >
              <Paperclip className="h-3.5 w-3.5" />
              {prospect.pipeline.pdf_attached ? "PDF attached ✓" : "Mark PDF attached"}
            </button>
          </div>
        </article>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => setEditingTemplate((v) => !v)}
            className="inline-flex items-center gap-1.5 text-[11px] text-subtle transition-colors hover:text-foreground"
          >
            <Settings2 className="h-3 w-3" />
            {editingTemplate ? "Close template editor" : "Edit email template"}
          </button>
          {editingTemplate ? (
            <div className="mt-3 space-y-2">
              <textarea
                value={settings.emailTemplate}
                onChange={(ev) => updateSettings({ emailTemplate: ev.target.value })}
                rows={12}
                className="w-full rounded-[10px] border border-border bg-background p-4 font-mono text-[12px] leading-relaxed text-foreground outline-none focus:border-border-strong"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-subtle">
                  {"Tokens fill per prospect: {{firstName}} {{company}} {{industryClause}} {{bottleneck}} {{whyNow}} {{bookingUrl}} {{website}} {{senderName}} {{senderCompany}}"}
                </p>
                <button
                  type="button"
                  onClick={() => updateSettings({ emailTemplate: DEFAULT_EMAIL_TEMPLATE })}
                  className="text-[11px] text-subtle underline underline-offset-2 hover:text-foreground"
                >
                  Reset to default
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <p className="label-caps">Outreach Angle</p>
            <EditableText
              className="mt-1"
              value={prospect.outreachAngle}
              placeholder="One line that earns the open"
              onChange={(v) => updateProspect(prospect.id, { outreachAngle: v })}
            />
          </div>
          <div className="flex shrink-0 items-center gap-2 text-[11px] text-subtle">
            <FileText className="h-3.5 w-3.5" /> Intelligence score {score}
          </div>
        </div>
      </div>
    </Panel>
  );
}
