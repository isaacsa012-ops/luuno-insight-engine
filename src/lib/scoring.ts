import { AUDIT_SECTIONS, PIPELINE_STEPS } from "./domain";
import type { AuditItem, Prospect, Tier } from "./types";

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));
const filled = (s: string) => s.trim().length > 0;

/** Depth of a single written field: empty → 0, one line → partial, detailed → full. */
function depth(text: string): number {
  const len = text.trim().length;
  if (!len) return 0;
  if (len < 60) return 0.5;
  if (len < 160) return 0.8;
  return 1;
}

const AUDIT_FIELDS = ["observation", "evidence", "opportunity", "recommendation"] as const;

/** Section score is derived from what has actually been documented — never hand set. */
export function sectionScore(item: AuditItem): number {
  const total = AUDIT_FIELDS.reduce((sum, f) => sum + depth(item[f]), 0);
  return Math.round((total / AUDIT_FIELDS.length) * 100);
}

export function auditSectionsComplete(prospect: Prospect): number {
  return AUDIT_SECTIONS.filter((s) => filled(prospect.audit[s.key].observation)).length;
}

/** How well we understand the business: research depth + audit coverage. */
export function intelligenceScore(prospect: Prospect): number {
  const research = Object.values(prospect.research);
  const researchDepth = research.reduce((sum, v) => sum + depth(v), 0) / research.length;
  const auditDepth =
    AUDIT_SECTIONS.reduce((sum, s) => sum + sectionScore(prospect.audit[s.key]), 0) /
    (AUDIT_SECTIONS.length * 100);
  const signals = Math.min(prospect.whyNow.length, 3) / 3;
  return Math.round(clamp((researchDepth * 0.45 + auditDepth * 0.45 + signals * 0.1) * 100));
}

/** How much upside the documented findings represent. */
export function opportunityScore(prospect: Prospect): number {
  const value = Math.min(prospect.opportunityValue / 150000, 1);
  const gaps =
    AUDIT_SECTIONS.filter((s) => filled(prospect.audit[s.key].opportunity)).length /
    AUDIT_SECTIONS.length;
  const bottlenecks = depth(prospect.research.bottlenecks);
  const urgency = Math.min(prospect.whyNow.length, 4) / 4;
  return Math.round(clamp((value * 0.4 + gaps * 0.25 + bottlenecks * 0.15 + urgency * 0.2) * 100));
}

const FIT_INDUSTRIES = [
  "hvac",
  "dental",
  "logistics",
  "freight",
  "legal",
  "grounds",
  "landscape",
  "medical",
  "construction",
  "home service",
  "clinic",
  "property",
];

const URGENT_SIGNALS = [
  "Hiring",
  "Expanding",
  "Growing rapidly",
  "Recently raised funding",
  "Opening locations",
  "Recent leadership change",
];

export interface PriorityFactor {
  label: string;
  score: number;
  max: number;
  detail: string;
}

export interface PriorityResult {
  score: number;
  tier: Tier;
  factors: PriorityFactor[];
}

export const TIER_LABEL: Record<Tier, string> = {
  A: "Tier A",
  B: "Tier B",
  C: "Tier C",
  D: "Tier D",
};

export const TIER_HEADLINE: Record<Tier, string> = {
  A: "Highest Priority",
  B: "High Value",
  C: "Good Fit",
  D: "Low Priority",
};

export const TIER_DIRECTIVE: Record<Tier, string> = {
  A: "Immediate outreach.",
  B: "Reach out this week.",
  C: "Continue research.",
  D: "Archive or revisit later.",
};

export const TIER_ORDER: Tier[] = ["A", "B", "C", "D"];

export function tierOf(score: number): Tier {
  if (score >= 75) return "A";
  if (score >= 55) return "B";
  if (score >= 35) return "C";
  return "D";
}

/** Deterministic 0-100 priority score. No manual override anywhere in the app. */
export function priorityScore(prospect: Prospect): PriorityResult {
  const value = Math.min(prospect.opportunityValue / 150000, 1) * 25;

  const evidenceRatio = auditSectionsComplete(prospect) / AUDIT_SECTIONS.length;
  const evidence = evidenceRatio * 15;

  const urgentCount = prospect.whyNow.filter((s) => URGENT_SIGNALS.includes(s)).length;
  const urgency = Math.min(urgentCount / 3, 1) * 15;

  const industry = prospect.industry.toLowerCase();
  const fitScore = FIT_INDUSTRIES.some((f) => industry.includes(f)) ? 10 : 4;

  const size =
    prospect.employees >= 20 && prospect.employees <= 250
      ? 10
      : prospect.employees >= 10
        ? 6
        : prospect.employees > 0
          ? 3
          : 0;

  const hasDm = filled(prospect.research.decisionMaker) || filled(prospect.email);
  const dm = hasDm ? 15 : 0;

  const response = prospect.repliedAt
    ? 10
    : prospect.pipeline.email_sent
      ? 5
      : Math.round((prospect.confidence / 100) * 7);

  const factors: PriorityFactor[] = [
    {
      label: "Opportunity Value",
      score: value,
      max: 25,
      detail: `${Math.round(prospect.opportunityValue / 1000)}k estimated`,
    },
    {
      label: "Evidence of Need",
      score: evidence,
      max: 15,
      detail: `${auditSectionsComplete(prospect)}/${AUDIT_SECTIONS.length} audit sections documented`,
    },
    { label: "Urgency", score: urgency, max: 15, detail: `${urgentCount} urgent signals` },
    { label: "Industry Fit", score: fitScore, max: 10, detail: prospect.industry || "Unknown" },
    { label: "Company Size", score: size, max: 10, detail: `${prospect.employees} employees` },
    {
      label: "Decision Maker",
      score: dm,
      max: 15,
      detail: hasDm ? "Identified" : "Not identified",
    },
    {
      label: "Response Likelihood",
      score: response,
      max: 10,
      detail: prospect.repliedAt ? "Already replied" : `${prospect.confidence}% confidence`,
    },
  ];

  const score = Math.round(factors.reduce((sum, f) => sum + f.score, 0));
  return { score, tier: tierOf(score), factors };
}

export interface NextAction {
  label: string;
  hint: string;
  step: (typeof PIPELINE_STEPS)[number]["key"] | null;
}

/** The single next thing that moves this company closer to becoming a client. */
export function nextAction(prospect: Prospect): NextAction {
  const p = prospect.pipeline;
  const researchDone =
    filled(prospect.research.businessSummary) && filled(prospect.research.bottlenecks);

  if (!researchDone)
    return { label: "Research Missing", hint: "Populate the Research Workspace", step: "research" };
  if (auditSectionsComplete(prospect) < 5)
    return { label: "Generate Audit", hint: "Document the nine audit sections", step: "audit" };
  if (!p.video_recorded)
    return { label: "Record Video", hint: "Personalised audit walkthrough", step: "video_recorded" };
  if (!p.email_ready)
    return { label: "Prepare Email", hint: "Review the outreach preview", step: "email_ready" };
  if (!p.pdf_attached)
    return { label: "Attach PDF", hint: "Export the audit report", step: "pdf_attached" };
  if (!p.email_sent) return { label: "Send Email", hint: "Outreach is ready", step: "email_sent" };
  if (!prospect.repliedAt && !p.follow_up)
    return { label: "Follow Up", hint: "No reply recorded yet", step: "follow_up" };
  if (!p.discovery_call) return { label: "Book Call", hint: "Convert the reply", step: "discovery_call" };
  if (!p.proposal) return { label: "Proposal Needed", hint: "Call held, no proposal", step: "proposal" };
  if (!p.client) return { label: "Close Engagement", hint: "Proposal out — confirm decision", step: "client" };
  return { label: "Active Client", hint: "Workflow complete", step: null };
}

export function pipelineProgress(prospect: Prospect): number {
  const done = PIPELINE_STEPS.filter((s) => prospect.pipeline[s.key]).length;
  return Math.round((done / PIPELINE_STEPS.length) * 100);
}
