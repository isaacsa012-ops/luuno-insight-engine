import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft, Clock, ListChecks, Printer, User } from "lucide-react";
import { Meter, PageHeader, Panel, PanelHeader } from "@/components/kit/Panel";
import { EditableText } from "@/components/kit/Editable";
import { OpsDiagram } from "@/components/flow/OpsDiagram";

import { useStore } from "@/lib/store";
import { AUDIT_SECTIONS } from "@/lib/domain";
import { currency, shortDate } from "@/lib/format";
import { intelligenceScore, opportunityScore, sectionScore } from "@/lib/scoring";
import type { AuditSectionKey } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/audit/$prospectId")({
  head: () => ({
    meta: [
      { title: "Audit Report · Luuno Growth Engine" },
      {
        name: "description",
        content:
          "Nine-section business systems audit with observations, evidence, opportunities and recommendations, ready for PDF export.",
      },
      { property: "og:title", content: "Audit Report · Luuno Growth Engine" },
      {
        property: "og:description",
        content: "Scored business systems audit for a single company.",
      },
    ],
  }),
  component: AuditReport,
});

function AuditReport() {
  const { prospectId } = Route.useParams();
  const { getProspect, updateProspect, hydrated } = useStore();
  const prospect = getProspect(prospectId);

  if (hydrated && !prospect) throw notFound();
  if (!prospect) return null;

  const intelligence = intelligenceScore(prospect);
  const opportunity = opportunityScore(prospect);

  const setField = (
    key: AuditSectionKey,
    field: "observation" | "evidence" | "opportunity" | "recommendation",
    value: string,
  ) =>
    updateProspect(prospect.id, {
      audit: { ...prospect.audit, [key]: { ...prospect.audit[key], [field]: value } },
    });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="space-y-8"
    >
      <Link
        to="/audit"
        className="inline-flex items-center gap-1.5 text-[12px] text-subtle transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Audit Library
      </Link>

      <PageHeader
        eyebrow="Business Systems Audit"
        title={prospect.company}
        description="Scores are calculated from what has been documented. Fill a section and the score moves."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/prospects/$prospectId"
              params={{ prospectId: prospect.id }}
              className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-border bg-surface px-3 text-[12px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
            >
              <User className="h-3.5 w-3.5" /> Open Prospect
            </Link>
            <Link
              to="/prospects/$prospectId"
              params={{ prospectId: prospect.id }}
              search={{ tab: "timeline" }}
              className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-border bg-surface px-3 text-[12px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
            >
              <Clock className="h-3.5 w-3.5" /> View Timeline
            </Link>
            <Link
              to="/pipeline"
              className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-border bg-surface px-3 text-[12px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
            >
              <ListChecks className="h-3.5 w-3.5" /> Content Pipeline
            </Link>
            <button
              type="button"
              onClick={() => {
                toast.success("Print dialog opened — save as PDF");
                window.location.assign(`/report/${prospect.id}`);
              }}
              className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-foreground px-3 text-[12px] font-medium text-background"
            >
              <Printer className="h-3.5 w-3.5" /> Export PDF
            </button>
          </div>
        }
      />

      <Panel className="border-border-strong print-block">
        <div className="grid grid-cols-1 gap-6 px-6 py-6 md:grid-cols-[minmax(0,1fr)_200px_200px] md:items-end">
          <div className="min-w-0">
            <p className="label-caps">Prepared for</p>
            <h2 className="mt-2 truncate text-[24px] font-semibold tracking-tight">
              {prospect.owner || prospect.company}
            </h2>
            <p className="mt-1 text-[12px] text-subtle">
              {prospect.industry} · {hydrated ? shortDate(new Date().toISOString()) : ""} ·
              Opportunity {currency(prospect.opportunityValue, true)}
            </p>
          </div>
          {[
            { label: "Intelligence Score", value: intelligence },
            { label: "Opportunity Score", value: opportunity },
          ].map((s) => (
            <div key={s.label}>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
                <p className="label-caps">{s.label}</p>
                <span className="text-[28px] font-semibold leading-none tabular-nums">{s.value}</span>
              </div>
              <Meter value={s.value} className="mt-3" />
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title="Current vs Future Operations"
          description="Simulate how the Luuno intelligence layer sits inside the systems this business already runs."
        />
        <div className="px-5 py-5">
          <OpsDiagram prospect={prospect} />
        </div>
      </Panel>

      <div className="space-y-4">

        {AUDIT_SECTIONS.map((section, i) => {
          const item = prospect.audit[section.key];
          const score = sectionScore(item);
          return (
            <Panel key={section.key} className="print-block">
              <PanelHeader
                title={`${String(i + 1).padStart(2, "0")} · ${section.label}`}
                description={section.brief}
                action={
                  <div className="flex items-center gap-3">
                    <Meter value={score} className="w-28" />
                    <span className="w-9 text-right text-[14px] tabular-nums text-muted-foreground">
                      {score}
                    </span>
                  </div>
                }
              />
              <div className="grid grid-cols-1 gap-px bg-border md:grid-cols-2">
                {(
                  [
                    ["observation", "Observation"],
                    ["evidence", "Evidence"],
                    ["opportunity", "Opportunity"],
                    ["recommendation", "Recommendation"],
                  ] as const
                ).map(([field, label]) => (
                  <div key={field} className="bg-surface px-5 py-4">
                    <p className="label-caps">{label}</p>
                    <EditableText
                      className="mt-2"
                      multiline
                      rows={4}
                      value={item[field]}
                      onChange={(v) => setField(section.key, field, v)}
                    />
                  </div>
                ))}
              </div>
            </Panel>
          );
        })}
      </div>
    </motion.div>
  );
}
