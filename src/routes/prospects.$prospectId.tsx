import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, FileDown, Paperclip } from "lucide-react";
import { EmptyState, Meter, PageHeader, Panel, PanelHeader, SectionLabel } from "@/components/kit/Panel";
import { PriorityTag, SignalTag, StatusPill } from "@/components/kit/Tags";
import { EditableText, FieldRow } from "@/components/kit/Editable";
import { OpsDiagram } from "@/components/flow/OpsDiagram";
import { useStore } from "@/lib/store";
import { currency, dateTime, relativeDay } from "@/lib/format";
import {
  AUDIT_SECTIONS,
  PIPELINE_STEPS,
  PRIORITY_LABEL,
  STATUS_LABEL,
  STATUS_ORDER,
  WHY_NOW_SIGNALS,
} from "@/lib/domain";
import { cn } from "@/lib/utils";
import type { Priority, Prospect, ProspectStatus, ResearchSection } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/prospects/$prospectId")({
  head: () => ({
    meta: [
      { title: "Prospect Workspace · Luuno Growth Engine" },
      {
        name: "description",
        content:
          "Company workspace containing research, why-now signals, the operations model, audit findings and delivery timeline.",
      },
      { property: "og:title", content: "Prospect Workspace · Luuno Growth Engine" },
      {
        property: "og:description",
        content: "Everything Luuno knows about a company in one engineered workspace.",
      },
    ],
  }),
  component: ProspectWorkspace,
});

const RESEARCH_FIELDS: { key: keyof ResearchSection; label: string; hint: string }[] = [
  { key: "businessSummary", label: "Business Summary", hint: "What the company actually does and how it makes money." },
  { key: "customerJourney", label: "Customer Journey", hint: "The real path a customer takes today, step by step." },
  { key: "strengths", label: "Strengths", hint: "What is genuinely working and must be protected." },
  { key: "weaknesses", label: "Weaknesses", hint: "Structural gaps, not cosmetic complaints." },
  { key: "bottlenecks", label: "Observed Bottlenecks", hint: "Where throughput is constrained by a person or a manual step." },
  { key: "opportunities", label: "Opportunities", hint: "Where systems would create measurable leverage." },
  { key: "recommendation", label: "Luuno Recommendation", hint: "The specific engagement we propose and the outcome we commit to." },
];

function ProspectWorkspace() {
  const { prospectId } = Route.useParams();
  const { getProspect, updateProspect, logActivity } = useStore();
  const prospect = getProspect(prospectId);
  const [tab, setTab] = useState("overview");

  if (!prospect) throw notFound();

  const patch = (p: Partial<Prospect>) => updateProspect(prospect.id, p);
  const patchResearch = (key: keyof ResearchSection, value: string) =>
    patch({ research: { ...prospect.research, [key]: value } });

  const auditedSections = AUDIT_SECTIONS.filter((s) => prospect.audit[s.key].observation);
  const auditScore = auditedSections.length
    ? Math.round(
        auditedSections.reduce((sum, s) => sum + prospect.audit[s.key].score, 0) / auditedSections.length,
      )
    : 0;
  const completedSteps = PIPELINE_STEPS.filter((s) => prospect.pipeline[s.key]).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="space-y-8"
    >
      <Link
        to="/prospects"
        className="inline-flex items-center gap-1.5 text-[12px] text-subtle transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Prospects
      </Link>

      <PageHeader
        eyebrow={prospect.industry}
        title={prospect.company}
        description={prospect.outreachAngle || "No outreach angle recorded yet."}
        actions={
          <div className="flex items-center gap-3">
            <StatusPill status={prospect.status} />
            <div className="hidden text-right sm:block">
              <p className="text-[18px] font-semibold tabular-nums">
                {currency(prospect.opportunityValue, true)}
              </p>
              <p className="label-caps mt-0.5">Opportunity</p>
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Confidence", value: `${prospect.confidence}%`, meter: prospect.confidence },
          { label: "Audit Score", value: auditScore ? `${auditScore}` : "—", meter: auditScore },
          {
            label: "Pipeline",
            value: `${completedSteps}/${PIPELINE_STEPS.length}`,
            meter: (completedSteps / PIPELINE_STEPS.length) * 100,
          },
          { label: "Next Follow Up", value: relativeDay(prospect.nextFollowUp), meter: 0 },
        ].map((m) => (
          <div key={m.label} className="rounded-[10px] border border-border bg-surface p-4">
            <p className="label-caps truncate">{m.label}</p>
            <p className="mt-3 truncate text-[20px] font-semibold tabular-nums leading-none">{m.value}</p>
            {m.meter ? <Meter value={m.meter} className="mt-3" /> : null}
          </div>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-[8px] border border-border bg-surface p-1">
          {[
            ["overview", "Overview"],
            ["research", "Research"],
            ["operations", "Current vs Future"],
            ["audit", "Audit"],
            ["notes", "Notes"],
            ["attachments", "Attachments"],
            ["timeline", "Timeline"],
          ].map(([value, label]) => (
            <TabsTrigger
              key={value}
              value={value}
              className="rounded-[6px] px-3 py-1.5 text-[12px] whitespace-nowrap text-subtle data-[state=active]:bg-surface-raised data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <Panel className="border-border-strong">
            <PanelHeader
              title="Why Now"
              description="The specific reason Luuno is reaching out at this moment rather than any other."
            />
            <div className="space-y-5 px-5 py-5">
              <div className="flex flex-wrap gap-2">
                {WHY_NOW_SIGNALS.map((signal) => {
                  const active = prospect.whyNow.includes(signal);
                  return (
                    <button
                      key={signal}
                      type="button"
                      onClick={() =>
                        patch({
                          whyNow: active
                            ? prospect.whyNow.filter((s) => s !== signal)
                            : [...prospect.whyNow, signal],
                        })
                      }
                      className={cn(
                        "rounded-[6px] border px-2.5 py-1 text-[11px] transition-colors",
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-subtle hover:border-border-strong hover:text-muted-foreground",
                      )}
                    >
                      {signal}
                    </button>
                  );
                })}
              </div>
              <EditableText
                multiline
                rows={5}
                value={prospect.whyNowNarrative}
                onChange={(v) => patch({ whyNowNarrative: v })}
                placeholder="Document the trigger event, the evidence behind it and why it makes this the right moment."
              />
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Company Record" />
            <div className="px-5 py-2">
              <FieldRow label="Company">
                <EditableText value={prospect.company} onChange={(v) => patch({ company: v })} />
              </FieldRow>
              <FieldRow label="Owner">
                <EditableText value={prospect.owner} onChange={(v) => patch({ owner: v })} />
              </FieldRow>
              <FieldRow label="Industry">
                <EditableText value={prospect.industry} onChange={(v) => patch({ industry: v })} />
              </FieldRow>
              <FieldRow label="Employees">
                <EditableText
                  value={String(prospect.employees)}
                  onChange={(v) => patch({ employees: Number(v.replace(/[^0-9]/g, "")) || 0 })}
                />
              </FieldRow>
              <FieldRow label="Website">
                <EditableText value={prospect.website} onChange={(v) => patch({ website: v })} />
              </FieldRow>
              <FieldRow label="Phone">
                <EditableText value={prospect.phone} onChange={(v) => patch({ phone: v })} />
              </FieldRow>
              <FieldRow label="Email">
                <EditableText value={prospect.email} onChange={(v) => patch({ email: v })} />
              </FieldRow>
              <FieldRow label="Current Tech Stack">
                <EditableText
                  value={prospect.techStack.join(", ")}
                  onChange={(v) =>
                    patch({ techStack: v.split(",").map((s) => s.trim()).filter(Boolean) })
                  }
                  placeholder="Comma separated"
                />
              </FieldRow>
              <FieldRow label="Opportunity Value">
                <EditableText
                  value={String(prospect.opportunityValue)}
                  onChange={(v) => patch({ opportunityValue: Number(v.replace(/[^0-9]/g, "")) || 0 })}
                />
              </FieldRow>
              <FieldRow label="Status">
                <select
                  value={prospect.status}
                  onChange={(e) => {
                    const status = e.target.value as ProspectStatus;
                    patch({ status });
                    logActivity(prospect.id, `Status moved to ${STATUS_LABEL[status]}`);
                  }}
                  className="rounded-[8px] border border-border bg-background px-2.5 py-1.5 text-[13px] text-foreground outline-none"
                >
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </FieldRow>
              <FieldRow label="Priority">
                <select
                  value={prospect.priority}
                  onChange={(e) => patch({ priority: e.target.value as Priority })}
                  className="rounded-[8px] border border-border bg-background px-2.5 py-1.5 text-[13px] text-foreground outline-none"
                >
                  {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_LABEL[p]}
                    </option>
                  ))}
                </select>
              </FieldRow>
              <FieldRow label="Confidence Score">
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={prospect.confidence}
                    onChange={(e) => patch({ confidence: Number(e.target.value) })}
                    className="h-1 w-56 max-w-full accent-white"
                  />
                  <span className="text-[13px] tabular-nums">{prospect.confidence}%</span>
                </div>
              </FieldRow>
              <FieldRow label="Signals">
                <div className="flex flex-wrap gap-2 py-1">
                  {prospect.whyNow.length ? (
                    prospect.whyNow.map((s) => <SignalTag key={s}>{s}</SignalTag>)
                  ) : (
                    <span className="text-[12px] text-subtle italic">No signals recorded</span>
                  )}
                </div>
              </FieldRow>
              <FieldRow label="Priority Tag">
                <div className="py-1.5">
                  <PriorityTag priority={prospect.priority} />
                </div>
              </FieldRow>
            </div>
          </Panel>
        </TabsContent>

        {/* RESEARCH */}
        <TabsContent value="research" className="mt-6 space-y-4">
          {RESEARCH_FIELDS.map((f) => (
            <Panel key={f.key}>
              <PanelHeader title={f.label} description={f.hint} />
              <div className="px-5 py-4">
                <EditableText
                  multiline
                  rows={6}
                  value={prospect.research[f.key]}
                  onChange={(v) => patchResearch(f.key, v)}
                />
              </div>
            </Panel>
          ))}
        </TabsContent>

        {/* CURRENT vs FUTURE */}
        <TabsContent value="operations" className="mt-6 space-y-6">
          <Panel>
            <PanelHeader
              title="Operations Model"
              description="Current systems on the left. Simulate the future state to route every signal through the Luuno intelligence layer."
            />
            <div className="p-4">
              <OpsDiagram ops={prospect.currentOps} />
            </div>
          </Panel>
          <Panel>
            <PanelHeader title="Current Operations Inventory" description="Nodes rendered in the diagram." />
            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {prospect.currentOps.map((node, i) => (
                <div key={node.id} className="rounded-[10px] border border-border p-4">
                  <SectionLabel>{`Node ${String(i + 1).padStart(2, "0")}`}</SectionLabel>
                  <EditableText
                    className="mt-2"
                    value={node.label}
                    onChange={(v) =>
                      patch({
                        currentOps: prospect.currentOps.map((n) =>
                          n.id === node.id ? { ...n, label: v } : n,
                        ),
                      })
                    }
                  />
                  <EditableText
                    value={node.sublabel ?? ""}
                    placeholder="Describe how it is used today"
                    onChange={(v) =>
                      patch({
                        currentOps: prospect.currentOps.map((n) =>
                          n.id === node.id ? { ...n, sublabel: v } : n,
                        ),
                      })
                    }
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  patch({
                    currentOps: [
                      ...prospect.currentOps,
                      { id: `n-${Date.now().toString(36)}`, label: "New system", sublabel: "" },
                    ],
                  })
                }
                className="rounded-[10px] border border-dashed border-border p-4 text-[12px] text-subtle transition-colors hover:border-border-strong hover:text-muted-foreground"
              >
                Add system node
              </button>
            </div>
          </Panel>
        </TabsContent>

        {/* AUDIT */}
        <TabsContent value="audit" className="mt-6">
          <Panel>
            <PanelHeader
              title="Audit Summary"
              description="Full editing and export lives in the Audit Builder."
              action={
                <Link
                  to="/audit"
                  search={{ prospectId: prospect.id }}
                  className="rounded-[8px] border border-border px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                >
                  Open Audit Builder
                </Link>
              }
            />
            {auditedSections.length === 0 ? (
              <EmptyState
                title="No audit findings yet"
                description="Open the Audit Builder to document observations, evidence, opportunities and recommendations."
              />
            ) : (
              <ul>
                {auditedSections.map((s) => (
                  <li
                    key={s.key}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border px-5 py-4 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium">{s.label}</p>
                      <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-subtle">
                        {prospect.audit[s.key].observation}
                      </p>
                    </div>
                    <span className="shrink-0 text-[15px] tabular-nums">
                      {prospect.audit[s.key].score}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </TabsContent>

        {/* NOTES */}
        <TabsContent value="notes" className="mt-6">
          <Panel>
            <PanelHeader title="Notes" description="Internal context, positioning and language that works." />
            <div className="px-5 py-4">
              <EditableText
                multiline
                rows={10}
                value={prospect.notes}
                onChange={(v) => patch({ notes: v })}
              />
            </div>
          </Panel>
        </TabsContent>

        {/* ATTACHMENTS */}
        <TabsContent value="attachments" className="mt-6">
          <Panel>
            <PanelHeader
              title="Attachments"
              description="Audits, walkthrough videos, call recordings and supporting documents."
              action={
                <button
                  type="button"
                  onClick={() => {
                    patch({
                      attachments: [
                        {
                          id: `f-${Date.now().toString(36)}`,
                          name: `note-${new Date().toISOString().slice(0, 10)}.md`,
                          kind: "note",
                          size: "2 KB",
                          addedAt: new Date().toISOString(),
                        },
                        ...prospect.attachments,
                      ],
                    });
                    toast.success("Attachment record added");
                  }}
                  className="rounded-[8px] border border-border px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                >
                  Add record
                </button>
              }
            />
            {prospect.attachments.length === 0 ? (
              <EmptyState
                icon={<Paperclip className="h-4 w-4" />}
                title="No attachments"
                description="Audit PDFs, recordings and walkthrough videos attached to this prospect appear here."
              />
            ) : (
              <ul>
                {prospect.attachments.map((a) => (
                  <li
                    key={a.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border px-5 py-3.5 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px]">{a.name}</p>
                      <p className="mt-0.5 text-[11px] text-subtle uppercase tracking-wide">
                        {a.kind} · {a.size}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] text-subtle">{dateTime(a.addedAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </TabsContent>

        {/* TIMELINE */}
        <TabsContent value="timeline" className="mt-6">
          <Panel>
            <PanelHeader title="Timeline" description="Every recorded event on this engagement." />
            <ol className="px-5 py-5">
              {[...prospect.timeline]
                .sort((a, b) => (a.at < b.at ? 1 : -1))
                .map((t) => (
                  <li key={t.id} className="relative grid grid-cols-[16px_minmax(0,1fr)] gap-4 pb-6 last:pb-0">
                    <div className="relative flex justify-center">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-border-strong" />
                      <span className="absolute top-4 bottom-[-24px] w-px bg-border" />
                    </div>
                    <div className="min-w-0">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                        <p className="truncate text-[13px]">{t.label}</p>
                        <span className="shrink-0 text-[11px] text-subtle">{dateTime(t.at)}</span>
                      </div>
                      {t.detail ? (
                        <p className="mt-1 text-[12px] leading-relaxed text-subtle">{t.detail}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
            </ol>
          </Panel>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-[8px] border border-border px-3 py-2 text-[12px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
        >
          <FileDown className="h-3.5 w-3.5" /> Export workspace
        </button>
      </div>
    </motion.div>
  );
}
