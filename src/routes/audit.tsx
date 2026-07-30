import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "motion/react";
import { FileDown, Printer } from "lucide-react";
import { EmptyState, Meter, PageHeader, Panel, PanelHeader } from "@/components/kit/Panel";
import { EditableText } from "@/components/kit/Editable";
import { useStore } from "@/lib/store";
import { AUDIT_SECTIONS } from "@/lib/domain";
import { currency, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AuditSectionKey } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/audit")({
  validateSearch: (search: Record<string, unknown>) => ({
    prospectId: typeof search.prospectId === "string" ? search.prospectId : "",
  }),
  head: () => ({
    meta: [
      { title: "Audit Builder · Luuno Growth Engine" },
      {
        name: "description",
        content:
          "Build a nine-section business systems audit with observations, evidence, opportunities and scored recommendations, ready for PDF export.",
      },
      { property: "og:title", content: "Audit Builder · Luuno Growth Engine" },
      {
        property: "og:description",
        content: "Nine-section scored business systems audit, export ready.",
      },
    ],
  }),
  component: AuditBuilder,
});

function AuditBuilder() {
  const { prospectId } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { prospects, updateProspect, hydrated } = useStore();

  const active = prospects.find((p) => p.id === prospectId) ?? prospects[0];

  const score = useMemo(() => {
    if (!active) return 0;
    const filled = AUDIT_SECTIONS.filter((s) => active.audit[s.key].observation);
    if (!filled.length) return 0;
    return Math.round(filled.reduce((sum, s) => sum + active.audit[s.key].score, 0) / filled.length);
  }, [active]);

  if (hydrated && !active) {
    return (
      <Panel>
        <EmptyState
          title="No prospects yet"
          description="Create a prospect before building an audit."
        />
      </Panel>
    );
  }
  if (!active) return null;

  const setField = (key: AuditSectionKey, field: keyof (typeof active.audit)[AuditSectionKey], value: string | number) =>
    updateProspect(active.id, {
      audit: { ...active.audit, [key]: { ...active.audit[key], [field]: value } },
    });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="space-y-8"
    >
      <PageHeader
        eyebrow="Intelligence"
        title="Audit Builder"
        description="Nine sections. Every finding requires an observation, the evidence behind it, the opportunity it unlocks and a concrete recommendation."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={active.id}
              onChange={(e) => navigate({ to: ".", search: { prospectId: e.target.value } })}
              className="h-9 rounded-[8px] border border-border bg-surface px-3 text-[12px] text-foreground outline-none"
            >
              {prospects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.company}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                toast.success("Print dialog opened — save as PDF");
                window.print();
              }}
              className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-border bg-surface px-3 text-[12px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
            >
              <Printer className="h-3.5 w-3.5" /> Export PDF
            </button>
          </div>
        }
      />

      <Panel className="border-border-strong print-block">
        <div className="grid grid-cols-1 gap-6 px-6 py-6 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
          <div className="min-w-0">
            <p className="label-caps">Business Systems Audit</p>
            <h2 className="mt-2 truncate text-[24px] font-semibold tracking-tight">{active.company}</h2>
            <p className="mt-1 text-[12px] text-subtle">
              {active.industry} · Prepared {shortDate(new Date().toISOString())} · Opportunity{" "}
              {currency(active.opportunityValue, true)}
            </p>
          </div>
          <div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
              <p className="label-caps">Composite Score</p>
              <span className="text-[28px] font-semibold leading-none tabular-nums">{score || "—"}</span>
            </div>
            <Meter value={score} className="mt-3" />
          </div>
        </div>
      </Panel>

      <div className="space-y-4">
        {AUDIT_SECTIONS.map((section, i) => {
          const item = active.audit[section.key];
          return (
            <Panel key={section.key} className="print-block">
              <PanelHeader
                title={`${String(i + 1).padStart(2, "0")} · ${section.label}`}
                description={section.brief}
                action={
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={item.score}
                      onChange={(e) => setField(section.key, "score", Number(e.target.value))}
                      className="h-1 w-28 accent-white"
                    />
                    <span
                      className={cn(
                        "w-9 text-right text-[14px] tabular-nums",
                        item.score >= 70 ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {item.score}
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

      <div className="flex items-center justify-between gap-4 rounded-[10px] border border-border bg-surface px-5 py-4">
        <p className="text-[12px] text-subtle">
          Export renders each section as a page block with the composite score on the cover.
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex shrink-0 items-center gap-2 rounded-[8px] bg-foreground px-3 py-2 text-[12px] font-medium text-background"
        >
          <FileDown className="h-3.5 w-3.5" /> Generate PDF
        </button>
      </div>
    </motion.div>
  );
}
