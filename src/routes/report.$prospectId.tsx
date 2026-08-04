import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, FileDown } from "lucide-react";
import { useStore } from "@/lib/store";
import { AUDIT_SECTIONS } from "@/lib/domain";
import { currency } from "@/lib/format";
import { intelligenceScore, opportunityScore, sectionScore } from "@/lib/scoring";

/**
 * Client-facing report: the PDF the prospect receives.
 *
 * Screen: a clean, readable review surface. Print: a branded document —
 * the "Export PDF" button opens the browser print dialog; choosing
 * "Save as PDF" produces the outreach attachment. Print CSS strips all
 * app chrome so only the document itself lands on paper.
 *
 * Deliberately contains NO internal data: no tier, no opportunity value,
 * no internal notes, no video kit. Those stay inside Luuno.
 */
export const Route = createFileRoute("/report/$prospectId")({
  head: () => ({
    meta: [{ title: "Intelligence Report · Luuno" }],
  }),
  component: ClientReport,
});

function ClientReport() {
  const { prospectId } = Route.useParams();
  const { getProspect, settings, hydrated } = useStore();
  const prospect = getProspect(prospectId);

  if (hydrated && !prospect) throw notFound();
  if (!prospect) return null;

  const intel = intelligenceScore(prospect);
  const opp = opportunityScore(prospect);
  const sections = AUDIT_SECTIONS.map((s) => ({
    ...s,
    item: prospect.audit[s.key],
    score: sectionScore(prospect.audit[s.key]),
  })).filter((s) => s.item.observation.trim());

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-[820px] px-6 py-10 print:max-w-none print:px-0 print:py-0">
      {/* Screen-only toolbar — never printed */}
      <div className="mb-8 flex items-center justify-between print:hidden">
        <Link
          to="/prospects/$prospectId"
          params={{ prospectId: prospect.id }}
          className="inline-flex items-center gap-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to workspace
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-[8px] bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <FileDown className="h-3.5 w-3.5" /> Export PDF
        </button>
      </div>

      <article className="report-doc bg-background text-foreground">
        {/* Cover header */}
        <header className="border-b-2 border-foreground pb-6">
          <p className="text-[11px] font-medium tracking-[0.25em] text-muted-foreground uppercase">
            {settings.senderCompany || "Luuno"} · Operational Intelligence Report
          </p>
          <h1 className="mt-3 text-[32px] leading-tight font-semibold tracking-tight">
            {prospect.company}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {[prospect.industry, prospect.location].filter(Boolean).join(" · ")}
          </p>
          <div className="mt-5 flex gap-10">
            <div>
              <p className="text-[11px] tracking-wider text-muted-foreground uppercase">
                Intelligence score
              </p>
              <p className="text-[26px] font-semibold tabular-nums">{intel}</p>
            </div>
            <div>
              <p className="text-[11px] tracking-wider text-muted-foreground uppercase">
                Opportunity score
              </p>
              <p className="text-[26px] font-semibold tabular-nums">{opp}</p>
            </div>
            <div className="ml-auto self-end text-right">
              <p className="text-[11px] tracking-wider text-muted-foreground uppercase">
                Prepared {today}
              </p>
              <p className="text-[13px] text-muted-foreground">
                by {settings.senderName || "Luuno"} · {settings.websiteUrl.replace(/^https?:\/\/(www\.)?/, "")}
              </p>
            </div>
          </div>
        </header>

        {/* Executive summary */}
        {prospect.research.businessSummary.trim() ? (
          <section className="report-section mt-8">
            <h2 className="report-h2">Executive summary</h2>
            <p className="report-body">{prospect.research.businessSummary}</p>
            {prospect.whyNowNarrative.trim() ? (
              <div className="mt-4 border-l-2 border-foreground pl-4">
                <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                  Why this matters now
                </p>
                <p className="report-body mt-1">{prospect.whyNowNarrative}</p>
              </div>
            ) : null}
          </section>
        ) : null}

        {/* Audit sections */}
        <section className="mt-10">
          <h2 className="report-h2 border-b border-border pb-2">
            Systems audit — {sections.length} of {AUDIT_SECTIONS.length} areas assessed
          </h2>
          {sections.map((s, i) => (
            <div key={s.key} className="report-section mt-7">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="text-[16px] font-semibold tracking-tight">
                  {String(i + 1).padStart(2, "0")} · {s.label}
                </h3>
                <span className="text-[13px] font-medium tabular-nums text-muted-foreground">
                  {s.score}/10
                </span>
              </div>
              <dl className="mt-3 space-y-3">
                <ReportField label="Observation" value={s.item.observation} />
                <ReportField label="Evidence" value={s.item.evidence} />
                <ReportField label="Opportunity" value={s.item.opportunity} />
                <ReportField label="Recommendation" value={s.item.recommendation} />
              </dl>
            </div>
          ))}
        </section>

        {/* Closing */}
        <footer className="report-section mt-12 border-t-2 border-foreground pt-6">
          <h2 className="report-h2">Next step</h2>
          <p className="report-body mt-1">
            This report covers what is visible from the outside. The full picture — and the
            plan for closing each gap without replacing any system you already run — is a
            conversation.
          </p>
          <p className="mt-4 text-[14px] font-medium">
            Book a consultation:{" "}
            <a href={settings.bookingUrl} className="underline underline-offset-2">
              {settings.bookingUrl.replace(/^https?:\/\//, "")}
            </a>
          </p>
          <p className="mt-6 text-[11px] tracking-wider text-muted-foreground uppercase">
            {settings.senderCompany || "Luuno"} · prepared for {prospect.company} · {today}
          </p>
        </footer>
      </article>

      <style>{`
        .report-h2 { font-size: 13px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; }
        .report-body { font-size: 14px; line-height: 1.65; }
        @media print {
          @page { margin: 18mm 16mm; }
          nav, aside, header.app-header { display: none !important; }
          body { background: #fff !important; }
          .report-doc { color: #000 !important; }
          .report-section { break-inside: avoid; }
          a { color: #000 !important; }
        }
      `}</style>
    </div>
  );
}

function ReportField({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3">
      <dt className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase pt-0.5">
        {label}
      </dt>
      <dd className="report-body text-muted-foreground">{value}</dd>
    </div>
  );
}
