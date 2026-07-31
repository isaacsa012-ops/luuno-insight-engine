import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "motion/react";
import { PageHeader, Panel, PanelHeader, Meter } from "@/components/kit/Panel";
import { useStore } from "@/lib/store";
import { STATUS_LABEL, STATUS_ORDER, WHY_NOW_SIGNALS } from "@/lib/domain";
import { currency } from "@/lib/format";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics · Luuno Growth Engine" },
      {
        name: "description",
        content:
          "Conversion, reply rate, pipeline value and closed MRR across every Luuno engagement, broken down by stage, industry and signal.",
      },
      { property: "og:title", content: "Analytics · Luuno Growth Engine" },
      {
        property: "og:description",
        content: "Stage conversion, reply rate and revenue performance across the Luuno pipeline.",
      },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { prospects } = useStore();

  const stats = useMemo(() => {
    const total = prospects.length;
    const sent = prospects.filter((p) => p.pipeline.email_sent).length;
    const replied = prospects.filter((p) => p.pipeline.email_sent && p.repliedAt).length;

    const calls = prospects.filter((p) => p.pipeline.discovery_call).length;
    const won = prospects.filter((p) => p.status === "closed_won");
    const lost = prospects.filter((p) => p.status === "closed_lost").length;
    const open = prospects.filter((p) => !p.status.startsWith("closed_"));
    return {
      total,
      sent,
      replied,
      calls,
      wonCount: won.length,
      lost,
      mrr: won.reduce((s, p) => s + p.closedMrr, 0),
      openValue: open.reduce((s, p) => s + p.opportunityValue, 0),
      replyRate: sent ? Math.round((replied / sent) * 100) : 0,
      callRate: replied ? Math.round((calls / replied) * 100) : 0,
      winRate: won.length + lost ? Math.round((won.length / (won.length + lost)) * 100) : 0,
      avgConfidence: total ? Math.round(prospects.reduce((s, p) => s + p.confidence, 0) / total) : 0,
    };
  }, [prospects]);

  const byStatus = STATUS_ORDER.map((s) => ({
    key: s,
    label: STATUS_LABEL[s],
    count: prospects.filter((p) => p.status === s).length,
    value: prospects.filter((p) => p.status === s).reduce((sum, p) => sum + p.opportunityValue, 0),
  }));
  const maxStatus = Math.max(1, ...byStatus.map((s) => s.count));

  const byIndustry = Object.entries(
    prospects.reduce<Record<string, number>>((acc, p) => {
      acc[p.industry] = (acc[p.industry] ?? 0) + p.opportunityValue;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const maxIndustry = Math.max(1, ...byIndustry.map(([, v]) => v));

  const bySignal = WHY_NOW_SIGNALS.map((signal) => ({
    signal,
    count: prospects.filter((p) => p.whyNow.includes(signal)).length,
  }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count);

  const funnel = [
    { label: "Researched", value: stats.total },
    { label: "Audited", value: prospects.filter((p) => p.pipeline.audit).length },
    { label: "Sent", value: stats.sent },
    { label: "Replied", value: stats.replied },
    { label: "Call booked", value: stats.calls },
    { label: "Closed won", value: stats.wonCount },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="space-y-8"
    >
      <PageHeader
        eyebrow="Performance"
        title="Analytics"
        description="Throughput and conversion across the entire engine, measured on the artefacts actually produced."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Closed MRR", value: currency(stats.mrr) },
          { label: "Open Pipeline", value: currency(stats.openValue, true) },
          { label: "Reply Rate", value: `${stats.replyRate}%`, meter: stats.replyRate },
          { label: "Win Rate", value: `${stats.winRate}%`, meter: stats.winRate },
        ].map((m) => (
          <div key={m.label} className="rounded-[10px] border border-border bg-surface p-5">
            <p className="label-caps">{m.label}</p>
            <p className="mt-3 truncate text-[24px] font-semibold leading-none tabular-nums">{m.value}</p>
            {m.meter !== undefined ? <Meter value={m.meter} className="mt-4" /> : null}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel>
          <PanelHeader title="Conversion Funnel" description="Absolute counts at each production gate." />
          <ul className="space-y-4 px-5 py-5">
            {funnel.map((f, i) => {
              const pct = funnel[0].value ? (f.value / funnel[0].value) * 100 : 0;
              return (
                <li key={f.label}>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
                    <p className="truncate text-[12px] text-muted-foreground">
                      {String(i + 1).padStart(2, "0")} · {f.label}
                    </p>
                    <span className="shrink-0 text-[13px] tabular-nums">
                      {f.value}
                      <span className="ml-2 text-[11px] text-subtle">{Math.round(pct)}%</span>
                    </span>
                  </div>
                  <Meter value={pct} className="mt-2" />
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel>
          <PanelHeader title="Stage Distribution" description="Where every company currently sits." />
          <ul className="space-y-4 px-5 py-5">
            {byStatus.map((s) => (
              <li key={s.key}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
                  <p className="truncate text-[12px] text-muted-foreground">{s.label}</p>
                  <span className="shrink-0 text-[12px] tabular-nums text-subtle">
                    {s.count} · {currency(s.value, true)}
                  </span>
                </div>
                <Meter value={(s.count / maxStatus) * 100} className="mt-2" />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <PanelHeader title="Opportunity by Industry" description="Total value concentrated per vertical." />
          <ul className="space-y-4 px-5 py-5">
            {byIndustry.map(([industry, value]) => (
              <li key={industry}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
                  <p className="truncate text-[12px] text-muted-foreground">{industry}</p>
                  <span className="shrink-0 text-[12px] tabular-nums">{currency(value, true)}</span>
                </div>
                <Meter value={(value / maxIndustry) * 100} className="mt-2" />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <PanelHeader title="Why Now Signals" description="Which triggers appear most across the register." />
          <ul className="divide-y divide-border">
            {bySignal.length === 0 ? (
              <li className="px-5 py-6 text-[12px] text-subtle">No signals recorded yet.</li>
            ) : (
              bySignal.map((s) => (
                <li key={s.signal} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 px-5 py-3.5">
                  <p className="truncate text-[12px] text-muted-foreground">{s.signal}</p>
                  <span className="shrink-0 text-[12px] tabular-nums">{s.count}</span>
                </li>
              ))
            )}
          </ul>
        </Panel>
      </div>
    </motion.div>
  );
}
