import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Search, SlidersHorizontal, Users } from "lucide-react";
import { EmptyState, PageHeader, Panel } from "@/components/kit/Panel";
import { StatusPill, TierTag } from "@/components/kit/Tags";
import { useStore } from "@/lib/store";
import { AUDIT_SECTIONS, STATUS_LABEL, STATUS_ORDER } from "@/lib/domain";
import { nextAction, priorityScore } from "@/lib/scoring";
import { currency, relativeDay } from "@/lib/format";

import { cn } from "@/lib/utils";
import type { ProspectStatus } from "@/lib/types";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/prospects/")({
  head: () => ({
    meta: [
      { title: "Prospects · Luuno Growth Engine" },
      {
        name: "description",
        content:
          "Every company Luuno is researching, auditing or engaging, with status, priority, confidence and opportunity value.",
      },
      { property: "og:title", content: "Prospects · Luuno Growth Engine" },
      {
        property: "og:description",
        content: "Filterable register of every active and closed Luuno engagement.",
      },
    ],
  }),
  component: ProspectsPage,
});

type SortKey = "priority" | "value" | "recent";

function ProspectsPage() {
  const { prospects, updateProspect, deleteProspect, hydrated } = useStore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ProspectStatus | "all">("all");
  const [sort, setSort] = useState<SortKey>("priority");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return prospects
      .map((p) => ({ ...p, priorityResult: priorityScore(p), action: nextAction(p) }))
      .filter((p) => (status === "all" ? true : p.status === status))
      .filter((p) =>
        q
          ? [
              p.company,
              p.owner,
              p.industry,
              p.outreachAngle,
              p.notes,
              STATUS_LABEL[p.status],
              ...p.whyNow,
              ...Object.values(p.research),
              ...AUDIT_SECTIONS.flatMap((s) => [
                p.audit[s.key].observation,
                p.audit[s.key].evidence,
                p.audit[s.key].opportunity,
                p.audit[s.key].recommendation,
              ]),
            ]
              .join(" ")
              .toLowerCase()
              .includes(q)
          : true,
      )
      .sort((a, b) => {
        if (sort === "value") return b.opportunityValue - a.opportunityValue;
        if (sort === "recent") return a.createdAt < b.createdAt ? 1 : -1;
        return b.priorityResult.score - a.priorityResult.score;
      });
  }, [prospects, query, status, sort]);


  const totalValue = rows.reduce((s, p) => s + p.opportunityValue, 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="space-y-8"
    >
      <PageHeader
        eyebrow="Register"
        title="Prospects"
        description="Each company is a workspace containing research, an audit, an operations model and a delivery pipeline."
        actions={
          <div className="hidden text-right sm:block">
            <p className="text-[18px] font-semibold tabular-nums">{currency(totalValue, true)}</p>
            <p className="label-caps mt-0.5">Filtered Opportunity</p>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex h-9 min-w-0 items-center gap-2.5 rounded-[8px] border border-border bg-surface px-3">
          <Search className="h-[14px] w-[14px] shrink-0 text-subtle" strokeWidth={1.75} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by company, owner, industry or signal"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-subtle"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-9 items-center gap-2 rounded-[8px] border border-border bg-surface px-3">
            <SlidersHorizontal className="h-[13px] w-[13px] text-subtle" strokeWidth={1.75} />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProspectStatus | "all")}
              className="bg-transparent text-[12px] text-muted-foreground outline-none"
            >
              <option value="all">All statuses</option>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex h-9 items-center rounded-[8px] border border-border bg-surface p-0.5">
            {(
              [
                ["priority", "Priority"],
                ["value", "Value"],
                ["recent", "Recent"],
              ] as const
            ).map(([key, label]) => (

              <button
                key={key}
                type="button"
                onClick={() => setSort(key)}
                className={cn(
                  "rounded-[6px] px-2.5 py-1.5 text-[12px] transition-colors",
                  sort === key ? "bg-surface-raised text-foreground" : "text-subtle hover:text-muted-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Panel className="overflow-hidden">
        <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_130px_110px_110px] gap-4 border-b border-border px-5 py-3 lg:grid">
          {["Company", "Next Action", "Status", "Priority", "Value"].map((h) => (
            <span key={h} className="label-caps">
              {h}
            </span>
          ))}
        </div>


        {!hydrated ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-[8px] bg-surface-raised" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Users className="h-4 w-4" />}
            title="No prospects match this filter"
            description="Adjust the search or status filter, or create a new prospect to begin research."
          />
        ) : (
          <ul>
            {rows.map((p) => (
              <ContextMenu key={p.id}>
                <ContextMenuTrigger asChild>
                  <li className="border-b border-border last:border-b-0">
                    <Link
                      to="/prospects/$prospectId"
                      params={{ prospectId: p.id }}
                      className="grid grid-cols-1 gap-2 px-5 py-4 transition-colors hover:bg-surface-raised lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)_130px_110px_110px_110px] lg:items-center lg:gap-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium">{p.company}</p>
                        <p className="truncate text-[11px] text-subtle">
                          {p.owner || "Owner unknown"} · {relativeDay(p.nextFollowUp)}
                        </p>
                      </div>
                      <p className="truncate text-[12px] text-muted-foreground">{p.industry}</p>
                      <div>
                        <StatusPill status={p.status} />
                      </div>
                      <PriorityTag priority={p.priority} />
                      <p className="text-[12px] tabular-nums text-muted-foreground">{p.confidence}%</p>
                      <p className="text-[13px] tabular-nums lg:text-right">
                        {currency(p.opportunityValue, true)}
                      </p>
                    </Link>
                  </li>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-56 rounded-[10px] border-border bg-surface">
                  {STATUS_ORDER.slice(0, 7).map((s) => (
                    <ContextMenuItem
                      key={s}
                      onSelect={() => {
                        updateProspect(p.id, { status: s });
                        toast.success(`${p.company} → ${STATUS_LABEL[s]}`);
                      }}
                    >
                      Move to {STATUS_LABEL[s]}
                    </ContextMenuItem>
                  ))}
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    onSelect={() => {
                      deleteProspect(p.id);
                      toast(`${p.company} removed`);
                    }}
                    className="text-destructive"
                  >
                    Delete prospect
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </ul>
        )}
      </Panel>
    </motion.div>
  );
}
