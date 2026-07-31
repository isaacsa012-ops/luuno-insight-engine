import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { PageHeader, Panel, PanelHeader, Meter } from "@/components/kit/Panel";
import { StatusPill } from "@/components/kit/Tags";
import { useStore } from "@/lib/store";
import { PIPELINE_STEPS } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { currency } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/pipeline")({
  head: () => ({
    meta: [
      { title: "Content Pipeline · Luuno Growth Engine" },
      {
        name: "description",
        content:
          "Track every prospect through the repeatable Luuno production workflow: research, audit, video, PDF, outreach, follow up, proposal, call.",
      },
      { property: "og:title", content: "Content Pipeline · Luuno Growth Engine" },
      {
        property: "og:description",
        content: "The repeatable production workflow behind every Luuno engagement.",
      },
    ],
  }),
  component: PipelinePage,
});

function PipelinePage() {
  const { prospects, updateProspect, logActivity } = useStore();

  const totals = PIPELINE_STEPS.map((step) => ({
    ...step,
    count: prospects.filter((p) => p.pipeline[step.key]).length,
  }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="space-y-8"
    >
      <PageHeader
        eyebrow="Production"
        title="Content Pipeline"
        description="A prospect only advances when the previous artefact exists. Toggle a step to record completion."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {totals.slice(0, 5).map((t) => (
          <div key={t.key} className="rounded-[10px] border border-border bg-surface p-4">
            <p className="label-caps truncate">{t.label}</p>
            <p className="mt-3 text-[22px] font-semibold leading-none tabular-nums">{t.count}</p>
            <Meter value={prospects.length ? (t.count / prospects.length) * 100 : 0} className="mt-3" />
          </div>
        ))}
      </div>

      <Panel className="overflow-x-auto">
        <PanelHeader
          title="Workflow Board"
          description={`${prospects.length} companies · ${PIPELINE_STEPS.length} production steps`}
        />
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[minmax(200px,1.6fr)_repeat(9,minmax(0,1fr))] gap-2 border-b border-border px-5 py-3">
            <span className="label-caps">Company</span>
            {PIPELINE_STEPS.map((s) => (
              <span key={s.key} className="label-caps text-center leading-tight">
                {s.label}
              </span>
            ))}
          </div>
          <ul>
            {prospects.map((p) => {
              const done = PIPELINE_STEPS.filter((s) => p.pipeline[s.key]).length;
              return (
                <li
                  key={p.id}
                  className="grid grid-cols-[minmax(200px,1.6fr)_repeat(9,minmax(0,1fr))] items-center gap-2 border-b border-border px-5 py-3 last:border-b-0"
                >
                  <div className="min-w-0">
                    <Link
                      to="/prospects/$prospectId"
                      params={{ prospectId: p.id }}
                      className="block truncate text-[13px] transition-colors hover:text-foreground"
                    >
                      {p.company}
                    </Link>
                    <div className="mt-1.5 flex items-center gap-2">
                      <StatusPill status={p.status} />
                      <span className="text-[11px] tabular-nums text-subtle">
                        {done}/{PIPELINE_STEPS.length}
                      </span>
                    </div>
                  </div>
                  {PIPELINE_STEPS.map((s) => {
                    const active = p.pipeline[s.key];
                    return (
                      <div key={s.key} className="flex justify-center">
                        <button
                          type="button"
                          aria-label={`${p.company} — ${s.label}`}
                          onClick={() => {
                            updateProspect(p.id, { pipeline: { ...p.pipeline, [s.key]: !active } });
                            if (!active) {
                              logActivity(p.id, `${s.label} completed`);
                              toast.success(`${p.company} · ${s.label}`);
                            }
                          }}
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-[6px] border transition-colors",
                            active
                              ? "border-foreground bg-foreground text-background"
                              : "border-border text-transparent hover:border-border-strong",
                          )}
                        >
                          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                        </button>
                      </div>
                    );
                  })}
                </li>
              );
            })}
          </ul>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Ready to Send" description="Audit and video complete, outreach not yet sent." />
        <ul>
          {prospects
            .filter((p) => p.pipeline.pdf_attached && !p.pipeline.email_sent)
            .map((p) => (
              <li
                key={p.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border px-5 py-4 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px]">{p.company}</p>
                  <p className="truncate text-[11px] text-subtle">{p.outreachAngle || "No angle recorded"}</p>
                </div>
                <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
                  {currency(p.opportunityValue, true)}
                </span>
              </li>
            ))}
          {prospects.filter((p) => p.pipeline.pdf_attached && !p.pipeline.email_sent).length === 0 ? (
            <li className="px-5 py-6 text-[12px] text-subtle">Nothing queued for outreach.</li>
          ) : null}
        </ul>
      </Panel>
    </motion.div>
  );
}
