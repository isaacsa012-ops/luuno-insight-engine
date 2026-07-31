import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "motion/react";
import { ArrowUpRight, CalendarClock, Inbox, Target } from "lucide-react";
import { Metric } from "@/components/kit/Metric";
import { EmptyState, Meter, Panel, PanelHeader, PageHeader } from "@/components/kit/Panel";
import { StatusPill, TierTag } from "@/components/kit/Tags";
import { useStore } from "@/lib/store";
import { currency, relativeDay, timeAgo } from "@/lib/format";
import {
  TIER_DIRECTIVE,
  TIER_HEADLINE,
  TIER_LABEL,
  TIER_ORDER,
  nextAction,
  priorityScore,
} from "@/lib/scoring";
import type { Prospect, Tier } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · Luuno Growth Engine" },
      {
        name: "description",
        content:
          "Tiered priority queue, weekly outreach goal tracking and the single next action required on every open engagement.",
      },
      { property: "og:title", content: "Dashboard · Luuno Growth Engine" },
      {
        property: "og:description",
        content: "Start with Tier A. Every company shows one highlighted next action.",
      },
    ],
  }),
  component: Dashboard,
});

function daysLeftInWeek(): number {
  const day = new Date().getDay(); // 0 Sun … 6 Sat
  return day === 0 ? 1 : 8 - day;
}

function Dashboard() {
  const { prospects, activity, settings, updateSettings, hydrated } = useStore();

  const scored = useMemo(
    () =>
      prospects.map((p) => ({
        prospect: p,
        priority: priorityScore(p),
        action: nextAction(p),
      })),
    [prospects],
  );

  const open = scored.filter(
    (s) => s.prospect.status !== "closed_won" && s.prospect.status !== "closed_lost",
  );

  const byTier = TIER_ORDER.map((tier) => ({
    tier,
    items: open
      .filter((s) => s.priority.tier === tier)
      .sort((a, b) => b.priority.score - a.priority.score),
  }));

  const outreachDone = prospects.filter(
    (p) => p.pipeline.email_sent || p.pipeline.video_recorded,
  ).length;
  const goal = Math.max(1, settings.weeklyOutreachGoal);
  const remaining = Math.max(0, goal - outreachDone);
  const daysLeft = hydrated ? daysLeftInWeek() : 0;
  const dailyRequired = daysLeft ? Math.ceil(remaining / daysLeft) : remaining;

  const countOpen = (fn: (p: Prospect) => boolean) =>
    open.filter((s) => fn(s.prospect)).length;

  const metrics = [
    { label: "Research Queue", value: countOpen((p) => !p.pipeline.research) },
    { label: "Audit Queue", value: countOpen((p) => p.pipeline.research && !p.pipeline.audit) },
    { label: "Videos Pending", value: countOpen((p) => p.pipeline.audit && !p.pipeline.video_recorded) },
    {
      label: "Emails Ready",
      value: countOpen((p) => p.pipeline.email_ready && !p.pipeline.email_sent),
    },
    { label: "Follow Ups", value: countOpen((p) => p.pipeline.email_sent && !p.repliedAt) },
    { label: "Calls Booked", value: prospects.filter((p) => p.pipeline.discovery_call).length },
    {
      label: "MRR Closed",
      value: currency(
        prospects.reduce((sum, p) => sum + p.closedMrr, 0),
        true,
      ),
    },
  ];


  const followUps = [...prospects]
    .filter((p) => p.nextFollowUp)
    .sort((a, b) => (a.nextFollowUp! < b.nextFollowUp! ? -1 : 1))
    .slice(0, 5);

  const feed = [
    ...activity.map((a) => ({ id: a.id, at: a.at, company: a.company, label: a.label })),
    ...prospects.flatMap((p) =>
      p.timeline.map((t) => ({ id: `${p.id}-${t.id}`, at: t.at, company: p.company, label: t.label })),
    ),
  ]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 8);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="space-y-10"
    >
      <PageHeader
        eyebrow="Operating View"
        title="Start with Tier A"
        description="Every company carries a calculated priority score and one highlighted next action."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {metrics.map((m, i) => (
          <Metric
            key={m.label}
            label={m.label}
            value={hydrated ? m.value : "—"}
            emphasis={i === metrics.length - 1}
          />
        ))}
      </div>

      <Panel className="border-border-strong">
        <PanelHeader
          title="Weekly Outreach Goal"
          description="Progress advances when a video is recorded or an email is sent."
          action={
            <div className="flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-subtle" />
              <input
                type="number"
                min={1}
                value={settings.weeklyOutreachGoal}
                onChange={(e) =>
                  updateSettings({ weeklyOutreachGoal: Number(e.target.value) || 1 })
                }
                className="h-8 w-20 rounded-[8px] border border-border bg-background px-2 text-right text-[12px] tabular-nums text-foreground outline-none focus:border-border-strong"
              />
            </div>
          }
        />
        <div className="px-5 py-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
            <p className="text-[24px] font-semibold tabular-nums leading-none">
              {hydrated ? `${outreachDone} / ${goal}` : "—"}
              <span className="ml-3 text-[12px] font-normal text-subtle">Complete</span>
            </p>
            <p className="text-[12px] tabular-nums text-muted-foreground">
              {hydrated ? `${remaining} remaining` : ""}
            </p>
          </div>
          <Meter value={(outreachDone / goal) * 100} className="mt-4" />
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: "Daily Average Required", value: hydrated ? `${dailyRequired}` : "—" },
              { label: "Remaining Days", value: hydrated ? `${daysLeft}` : "—" },
              {
                label: "Projected Finish",
                value: hydrated
                  ? remaining === 0
                    ? "Goal met"
                    : dailyRequired > 25
                      ? "At risk"
                      : "On track"
                  : "—",
              },
            ].map((s) => (
              <div key={s.label} className="rounded-[10px] border border-border px-4 py-3">
                <p className="label-caps truncate">{s.label}</p>
                <p className="mt-2 text-[16px] font-medium tabular-nums">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {byTier.map(({ tier, items }) => (
            <TierPanel key={tier} tier={tier} items={items} />
          ))}
        </div>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Upcoming Follow Ups" />
            {followUps.length === 0 ? (
              <EmptyState
                icon={<CalendarClock className="h-4 w-4" />}
                title="Nothing scheduled"
                description="Follow ups appear here once a date is set on a prospect."
              />
            ) : (
              <ul>
                {followUps.map((p) => (
                  <li key={p.id} className="border-b border-border last:border-b-0">
                    <Link
                      to="/prospects/$prospectId"
                      params={{ prospectId: p.id }}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-raised"
                    >
                      <span className="truncate text-[13px]">{p.company}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {hydrated ? relativeDay(p.nextFollowUp) : "—"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <PanelHeader title="Recent Activity" />
            <ul className="px-5 py-4">
              {feed.map((f) => (
                <li key={f.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] text-foreground">{f.label}</p>
                    <p className="truncate text-[11px] text-subtle">{f.company}</p>
                  </div>
                  <span className="shrink-0 pt-0.5 text-[11px] text-subtle">
                    {hydrated ? timeAgo(f.at) : ""}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </motion.div>
  );
}

function TierPanel({
  tier,
  items,
}: {
  tier: Tier;
  items: { prospect: Prospect; priority: { score: number }; action: { label: string; hint: string } }[];
}) {
  return (
    <Panel className={tier === "A" ? "border-border-strong" : undefined}>
      <PanelHeader
        title={`${TIER_LABEL[tier]} · ${TIER_HEADLINE[tier]}`}
        description={TIER_DIRECTIVE[tier]}
        action={
          <Link
            to="/prospects"
            className="flex items-center gap-1 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
          >
            {items.length} <ArrowUpRight className="h-3 w-3" />
          </Link>
        }
      />
      {items.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-4 w-4" />}
          title="No companies in this tier"
          description="Companies move between tiers automatically as research, evidence and signals are recorded."
        />
      ) : (
        <ul>
          {items.map(({ prospect: p, priority, action }) => (
            <li key={p.id} className="border-b border-border last:border-b-0">
              <Link
                to="/prospects/$prospectId"
                params={{ prospectId: p.id }}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-raised"
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                    <p className="truncate text-[13px] font-medium">{p.company}</p>
                    <StatusPill status={p.status} />
                    <TierTag tier={tier} score={priority.score} />
                  </div>
                  <p className="mt-1 truncate text-[12px] text-subtle">
                    {action.label} · {action.hint}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[13px] tabular-nums">{currency(p.opportunityValue, true)}</p>
                  <p className="mt-0.5 text-[11px] text-subtle">{p.industry}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
