import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { FileText, Search } from "lucide-react";
import { EmptyState, Meter, PageHeader, Panel } from "@/components/kit/Panel";
import { StatusPill, TierTag } from "@/components/kit/Tags";
import { useStore } from "@/lib/store";
import { shortDate } from "@/lib/format";
import { auditSectionsComplete, intelligenceScore, opportunityScore, priorityScore } from "@/lib/scoring";
import { AUDIT_SECTIONS } from "@/lib/domain";

export const Route = createFileRoute("/audit/")({
  head: () => ({
    meta: [
      { title: "Audit Library · Luuno Growth Engine" },
      {
        name: "description",
        content:
          "Every prospect audit in one library, with calculated intelligence and opportunity scores, status and last update.",
      },
      { property: "og:title", content: "Audit Library · Luuno Growth Engine" },
      {
        property: "og:description",
        content: "Permanent, scored business systems audits for every company Luuno researches.",
      },
    ],
  }),
  component: AuditLibrary,
});

function AuditLibrary() {
  const { prospects, hydrated } = useStore();
  const [query, setQuery] = useState("");

  const audits = useMemo(() => {
    const q = query.trim().toLowerCase();
    return prospects
      .map((p) => ({
        prospect: p,
        intelligence: intelligenceScore(p),
        opportunity: opportunityScore(p),
        tier: priorityScore(p).tier,
        complete: auditSectionsComplete(p),
        updated:
          [...p.timeline].sort((a, b) => (a.at < b.at ? 1 : -1))[0]?.at ?? p.createdAt,
      }))
      .filter((a) => {
        if (!q) return true;
        const haystack = [
          a.prospect.company,
          a.prospect.industry,
          a.prospect.owner,
          ...AUDIT_SECTIONS.map((s) => a.prospect.audit[s.key].observation),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => b.opportunity - a.opportunity);
  }, [prospects, query]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="space-y-8"
    >
      <PageHeader
        eyebrow="Intelligence"
        title="Audit Library"
        description="Every company automatically receives an audit. Scores are calculated from documented sections — never entered by hand."
        actions={
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-subtle" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search audits"
              className="h-9 w-56 rounded-[8px] border border-border bg-surface pl-9 pr-3 text-[12px] text-foreground outline-none focus:border-border-strong"
            />
          </div>
        }
      />

      {audits.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<FileText className="h-4 w-4" />}
            title="No audits match"
            description="Every prospect carries an audit. Adjust the search to find one."
          />
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {audits.map((a) => (
            <Link
              key={a.prospect.id}
              to="/audit/$prospectId"
              params={{ prospectId: a.prospect.id }}
              className="rounded-[10px] border border-border bg-surface transition-colors hover:border-border-strong"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-border px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium">{a.prospect.company}</p>
                  <p className="mt-1 truncate text-[12px] text-subtle">{a.prospect.industry}</p>
                </div>
                <TierTag tier={a.tier} />
              </div>
              <div className="grid grid-cols-2 gap-px bg-border">
                <div className="bg-surface px-5 py-4">
                  <p className="label-caps">Intelligence</p>
                  <p className="mt-2 text-[22px] font-semibold tabular-nums leading-none">
                    {a.intelligence}
                  </p>
                  <Meter value={a.intelligence} className="mt-3" />
                </div>
                <div className="bg-surface px-5 py-4">
                  <p className="label-caps">Opportunity</p>
                  <p className="mt-2 text-[22px] font-semibold tabular-nums leading-none">
                    {a.opportunity}
                  </p>
                  <Meter value={a.opportunity} className="mt-3" />
                </div>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-3">
                <StatusPill status={a.prospect.status} />
                <span className="shrink-0 text-[11px] text-subtle">
                  {a.complete}/{AUDIT_SECTIONS.length} sections ·{" "}
                  {hydrated ? shortDate(a.updated) : "—"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </motion.div>
  );
}
