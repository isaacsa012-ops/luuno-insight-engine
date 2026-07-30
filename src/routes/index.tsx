import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowUpRight, CalendarClock, Inbox } from "lucide-react";
import { Metric } from "@/components/kit/Metric";
import { EmptyState, Panel, PanelHeader, PageHeader } from "@/components/kit/Panel";
import { StatusPill } from "@/components/kit/Tags";
import { useStore } from "@/lib/store";
import { currency, relativeDay, timeAgo } from "@/lib/format";
import { PIPELINE_STEPS } from "@/lib/domain";
import type { Prospect } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · Luuno Growth Engine" },
      {
        name: "description",
        content:
          "Daily operating view: active research, audits ready, follow ups due and revenue closed across the Luuno pipeline.",
      },
      { property: "og:title", content: "Dashboard · Luuno Growth Engine" },
      {
        property: "og:description",
        content: "What the Luuno team should work on today, ranked by opportunity and urgency.",
      },
    ],
  }),
  component: Dashboard,
});

function nextAction(p: Prospect) {
  const step = PIPELINE_STEPS.find((s) => s.key !== "completed" && !p.pipeline[s.key]);
  return step?.label ?? "Close out engagement";
}

function Dashboard() {
  const { prospects, activity, hydrated } = useStore();

  const metrics = [
    { label: "Researching", value: prospects.filter((p) => p.status === "researching").length },
    { label: "Audit Ready", value: prospects.filter((p) => p.status === "audit_ready").length },
    { label: "Videos Pending", value: prospects.filter((p) => p.status === "video_pending").length },
    { label: "Follow Ups", value: prospects.filter((p) => p.status === "follow_up").length },
    { label: "Calls Booked", value: prospects.filter((p) => p.status === "call_booked").length },
    {
      label: "MRR Closed",
      value: currency(
        prospects.reduce((sum, p) => sum + p.closedMrr, 0),
        true,
      ),
    },
  ];

  const queue = [...prospects]
    .filter((p) => p.status !== "closed_won" && p.status !== "closed_lost")
    .sort((a, b) => {
      const rank = { critical: 0, high: 1, medium: 2, low: 3 } as const;
      const byPriority = rank[a.priority] - rank[b.priority];
      if (byPriority !== 0) return byPriority;
      return b.opportunityValue - a.opportunityValue;
    })
    .slice(0, 5);

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
        title="What should we work on today?"
        description="Ranked by priority and opportunity value across every active engagement."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {metrics.map((m, i) => (
          <Metric
            key={m.label}
            label={m.label}
            value={hydrated ? m.value : "—"}
            emphasis={i === metrics.length - 1}
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHeader
            title="Today's Action Queue"
            description="The highest-leverage next step for each open engagement."
            action={
              <Link
                to="/prospects"
                className="flex items-center gap-1 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
              >
                All prospects <ArrowUpRight className="h-3 w-3" />
              </Link>
            }
          />
          {queue.length === 0 ? (
            <EmptyState
              icon={<Inbox className="h-4 w-4" />}
              title="Queue is clear"
              description="No open engagements require action. Add a prospect to start the research cycle."
            />
          ) : (
            <ul>
              {queue.map((p) => (
                <li key={p.id} className="border-b border-border last:border-b-0">
                  <Link
                    to="/prospects/$prospectId"
                    params={{ prospectId: p.id }}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-raised"
                  >
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <p className="truncate text-[13px] font-medium">{p.company}</p>
                        <StatusPill status={p.status} />
                      </div>
                      <p className="mt-1 truncate text-[12px] text-subtle">
                        Next: {nextAction(p)} · {p.industry}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[13px] tabular-nums">{currency(p.opportunityValue, true)}</p>
                      <p className="mt-0.5 text-[11px] text-subtle">{p.confidence}% confidence</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

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
                        {relativeDay(p.nextFollowUp)}
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
                  <span className="shrink-0 pt-0.5 text-[11px] text-subtle">{timeAgo(f.at)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </motion.div>
  );
}
