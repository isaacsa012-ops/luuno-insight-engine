import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, FileDown, Paperclip } from "lucide-react";
import { EmptyState, Meter, PageHeader, Panel, PanelHeader, SectionLabel } from "@/components/kit/Panel";
import { SignalTag, StatusPill, TierTag } from "@/components/kit/Tags";
import { EditableText, FieldRow } from "@/components/kit/Editable";
import { OpsDiagram } from "@/components/flow/OpsDiagram";
import { ResearchWorkspace } from "@/components/research/ResearchWorkspace";
import { EmailPreview } from "@/components/outreach/EmailPreview";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { useStore } from "@/lib/store";
import { currency, dateTime, relativeDay } from "@/lib/format";
import { AUDIT_SECTIONS, PIPELINE_STEPS, STATUS_LABEL, STATUS_ORDER, WHY_NOW_SIGNALS } from "@/lib/domain";
import {
  TIER_DIRECTIVE,
  TIER_HEADLINE,
  intelligenceScore,
  nextAction,
  opportunityScore,
  priorityScore,
  sectionScore,
} from "@/lib/scoring";
import { cn } from "@/lib/utils";
import type { Prospect, ProspectStatus } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const TABS = [
  ["overview", "Overview"],
  ["research", "Research Workspace"],
  ["audit", "Audit"],
  ["outreach", "Email & Outreach"],
  ["analyst", "Analyst"],
  ["operations", "Current vs Future"],
  ["attachments", "Attachments"],
  ["timeline", "Timeline"],
] as const;

export const Route = createFileRoute("/prospects/$prospectId")({
  validateSearch: (search: Record<string, unknown>): { tab?: string } => ({
    tab: typeof search.tab === "string" ? search.tab : undefined,
  }),

  head: () => ({
    meta: [
      { title: "Prospect Workspace · Luuno Growth Engine" },
      {
        name: "description",
        content:
          "Research workspace, calculated audit, outreach preview, operations model and delivery timeline for a single company.",
      },
      { property: "og:title", content: "Prospect Workspace · Luuno Growth Engine" },
      {
        property: "og:description",
        content: "Everything Luuno knows about a company, and the one next action required.",
      },
    ],
  }),
  component: ProspectWorkspace,
});

function ProspectWorkspace() {
  const { prospectId } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { getProspect, updateProspect, logActivity, addTimelineEvent, hydrated } = useStore();
  const prospect = getProspect(prospectId);

  if (hydrated && !prospect) throw notFound();
  if (!prospect) return null;

  const patch = (p: Partial<Prospect>) => updateProspect(prospect.id, p);
  const setTab = (value: string) => navigate({ to: ".", search: { tab: value } });

  const priority = priorityScore(prospect);
  const intelligence = intelligenceScore(prospect);
  const opportunity = opportunityScore(prospect);
  const action = nextAction(prospect);
  const auditedSections = AUDIT_SECTIONS.filter((s) => prospect.audit[s.key].observation);
  const completedSteps = PIPELINE_STEPS.filter((s) => prospect.pipeline[s.key]).length;

  const toggleStep = (key: (typeof PIPELINE_STEPS)[number]["key"], label: string) => {
    const active = prospect.pipeline[key];
    patch({ pipeline: { ...prospect.pipeline, [key]: !active } });
    if (!active) {
      logActivity(prospect.id, `${label} completed`);
      addTimelineEvent(prospect.id, { kind: "system", label: `${label} completed` });
      toast.success(`${prospect.company} · ${label}`);
    }
  };

  const runNextAction = () => {
    if (action.step === "research") return setTab("research");
    if (action.step === "audit")
      return void navigate({ to: "/audit/$prospectId", params: { prospectId: prospect.id } });
    if (action.step === "email_ready" || action.step === "email_sent") return setTab("outreach");
    if (action.step) return toggleStep(action.step, action.label);
    setTab("timeline");
  };

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
            <TierTag tier={priority.tier} score={priority.score} />
            <div className="hidden text-right sm:block">
              <p className="text-[18px] font-semibold tabular-nums">
                {currency(prospect.opportunityValue, true)}
              </p>
              <p className="label-caps mt-0.5">Opportunity</p>
            </div>
          </div>
        }
      />

      {/* NEXT ACTION */}
      <Panel className="border-border-strong">
        <div className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <SectionLabel>Next Action</SectionLabel>
            <p className="mt-2 truncate text-[20px] font-semibold tracking-tight">{action.label}</p>
            <p className="mt-1 truncate text-[12px] text-subtle">{action.hint}</p>
          </div>
          <button
            type="button"
            onClick={runNextAction}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[8px] bg-foreground px-4 text-[13px] font-medium text-background"
          >
            {action.label} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Priority Score", value: `${priority.score}`, meter: priority.score },
          { label: "Intelligence", value: `${intelligence}`, meter: intelligence },
          { label: "Opportunity", value: `${opportunity}`, meter: opportunity },
          {
            label: "Pipeline",
            value: `${completedSteps}/${PIPELINE_STEPS.length}`,
            meter: (completedSteps / PIPELINE_STEPS.length) * 100,
          },
        ].map((m) => (
          <div key={m.label} className="rounded-[10px] border border-border bg-surface p-4">
            <p className="label-caps truncate">{m.label}</p>
            <p className="mt-3 truncate text-[20px] font-semibold tabular-nums leading-none">{m.value}</p>
            <Meter value={m.meter} className="mt-3" />
          </div>
        ))}
      </div>

      <Tabs value={tab ?? "overview"} onValueChange={setTab}>
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-[8px] border border-border bg-surface p-1">
          {TABS.map(([value, label]) => (
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
              title={`Priority ${priority.score} · ${TIER_HEADLINE[priority.tier]}`}
              description={`${TIER_DIRECTIVE[priority.tier]} Calculated from the factors below — not manually set.`}
              action={<TierTag tier={priority.tier} />}
            />
            <ul className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
              {priority.factors.map((f) => (
                <li key={f.label} className="bg-surface px-5 py-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2">
                    <p className="truncate text-[12px] text-foreground">{f.label}</p>
                    <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
                      {Math.round(f.score)}/{f.max}
                    </span>
                  </div>
                  <Meter value={(f.score / f.max) * 100} className="mt-2.5" />
                  <p className="mt-2 truncate text-[11px] text-subtle">{f.detail}</p>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
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
                    addTimelineEvent(prospect.id, {
                      kind: "status",
                      label: `Status moved to ${STATUS_LABEL[status]}`,
                    });
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
              <FieldRow label="Next Follow Up">
                <input
                  type="date"
                  value={prospect.nextFollowUp ? prospect.nextFollowUp.slice(0, 10) : ""}
                  onChange={(e) =>
                    patch({
                      nextFollowUp: e.target.value ? new Date(e.target.value).toISOString() : null,
                    })
                  }
                  className="rounded-[8px] border border-border bg-background px-2.5 py-1.5 text-[13px] text-foreground outline-none"
                />
                <span className="ml-3 text-[12px] text-subtle">
                  {hydrated ? relativeDay(prospect.nextFollowUp) : ""}
                </span>
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
            </div>
          </Panel>
        </TabsContent>

        {/* RESEARCH WORKSPACE */}
        <TabsContent value="research" className="mt-6">
          <ResearchWorkspace prospect={prospect} />
        </TabsContent>

        {/* AUDIT */}
        <TabsContent value="audit" className="mt-6">
          <Panel>
            <PanelHeader
              title="Audit Summary"
              description="Scores are calculated from documented sections. Full report and export live in the Audit Library."
              action={
                <Link
                  to="/audit/$prospectId"
                  params={{ prospectId: prospect.id }}
                  className="rounded-[8px] border border-border px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                >
                  Open Full Audit
                </Link>
              }
            />
            {auditedSections.length === 0 ? (
              <EmptyState
                title="No audit findings yet"
                description="Open the full audit to document observations, evidence, opportunities and recommendations."
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
                      {sectionScore(prospect.audit[s.key])}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </TabsContent>

        {/* OUTREACH */}
        <TabsContent value="outreach" className="mt-6 space-y-6">
          <EmailPreview prospect={prospect} />
          <Panel>
            <PanelHeader
              title="Outreach Checklist"
              description="Marking a step complete updates the pipeline, the timeline and the weekly goal."
            />
            <ul className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2">
              {PIPELINE_STEPS.map((s) => (
                <li key={s.key} className="bg-surface">
                  <button
                    type="button"
                    onClick={() => toggleStep(s.key, s.label)}
                    className="grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-raised"
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-[6px] border",
                        prospect.pipeline[s.key]
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-transparent",
                      )}
                    >
                      <Check className="h-3 w-3" strokeWidth={2.5} />
                    </span>
                    <span className="truncate text-[13px]">{s.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel>
            <PanelHeader title="Internal Notes" description="Positioning, objections and language that works. Never leaves Luuno." />
            <div className="px-5 py-4">
              <EditableText
                multiline
                rows={8}
                value={prospect.notes}
                onChange={(v) => patch({ notes: v })}
              />
            </div>
          </Panel>
        </TabsContent>

        {/* ANALYST */}
        <TabsContent value="analyst" className="mt-6">
          <AssistantPanel prospect={prospect} />
        </TabsContent>

        {/* CURRENT vs FUTURE */}
        <TabsContent value="operations" className="mt-6 space-y-6">
          <Panel>
            <PanelHeader
              title="Operations Model"
              description="Current systems on the left. Simulate the future state to route every signal through the Luuno intelligence layer."
            />
            <div className="p-4">
              <OpsDiagram prospect={prospect} />
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
                    <span className="shrink-0 text-[11px] text-subtle">
                      {hydrated ? dateTime(a.addedAt) : ""}
                    </span>
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
                        <span className="shrink-0 text-[11px] text-subtle">
                          {hydrated ? dateTime(t.at) : ""}
                        </span>
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
