import type { Prospect, ResearchSection } from "./types";

export interface ResearchFieldSpec {
  key: keyof ResearchSection | "opportunityValue" | "internalNotes" | "whyNow";
  token: string;
  label: string;
  hint: string;
  rows: number;
}

/**
 * The structured research contract. Both the generated prompt and the response
 * parser are driven from this list, so a future API integration only needs to
 * return the same tokens.
 */
export const RESEARCH_SPEC: ResearchFieldSpec[] = [
  {
    key: "businessSummary",
    token: "BUSINESS SUMMARY",
    label: "Business Summary",
    hint: "What the company does and how it actually makes money.",
    rows: 6,
  },
  {
    key: "customerJourney",
    token: "CUSTOMER JOURNEY",
    label: "Customer Journey",
    hint: "The real path a customer takes today, step by step.",
    rows: 6,
  },
  {
    key: "currentTechnology",
    token: "CURRENT TECHNOLOGY",
    label: "Current Technology",
    hint: "Systems in use today and how they are wired together.",
    rows: 4,
  },
  {
    key: "bottlenecks",
    token: "OBSERVED BOTTLENECKS",
    label: "Observed Bottlenecks",
    hint: "Where throughput is constrained by a person or a manual step.",
    rows: 6,
  },
  {
    key: "opportunities",
    token: "GROWTH OPPORTUNITIES",
    label: "Growth Opportunities",
    hint: "Where systems would create measurable leverage.",
    rows: 6,
  },
  {
    key: "decisionMaker",
    token: "DECISION MAKER",
    label: "Decision Maker",
    hint: "Who signs, what they care about, how to reach them.",
    rows: 4,
  },
  {
    key: "whyNow",
    token: "WHY NOW",
    label: "Why Now",
    hint: "The trigger event that makes this the right moment.",
    rows: 5,
  },
  {
    key: "opportunityValue",
    token: "ESTIMATED OPPORTUNITY VALUE",
    label: "Estimated Opportunity Value",
    hint: "Annualised value of the engagement, in USD.",
    rows: 2,
  },
  {
    key: "internalNotes",
    token: "INTERNAL NOTES",
    label: "Internal Notes",
    hint: "Positioning, language that works, things to avoid.",
    rows: 6,
  },
];

export function buildResearchPrompt(p: Prospect): string {
  return `You are a business systems analyst producing an operational intelligence brief for Luuno.

COMPANY: ${p.company}
WEBSITE: ${p.website || "unknown"}
INDUSTRY: ${p.industry || "unknown"}
OWNER / CONTACT: ${p.owner || "unknown"}${p.email ? ` (${p.email})` : ""}
APPROX HEADCOUNT: ${p.employees || "unknown"}
KNOWN TECH: ${p.techStack.length ? p.techStack.join(", ") : "unknown"}

Research this company and return a structured brief. Be specific and evidence-led.
Never speculate without labelling the assumption. Write in plain operator language,
no marketing tone, no mention of AI.

Return your answer using EXACTLY these headings, in this order, each on its own line
prefixed with "## ". Leave no heading empty.

## BUSINESS SUMMARY
What the business does, how it makes money, scale and market position.

## CUSTOMER JOURNEY
The real path a customer takes from first contact to delivered outcome.

## CURRENT TECHNOLOGY
Systems in use, how they connect, where data is re-entered by hand.

## OBSERVED BOTTLENECKS
Numbered list. Each bottleneck must name the constrained step and who owns it.

## GROWTH OPPORTUNITIES
Numbered list. Each opportunity must state the measurable outcome it unlocks.

## DECISION MAKER
Name, role, priorities, and the most credible way to reach them.

## WHY NOW
The specific trigger event and the evidence behind it.

## ESTIMATED OPPORTUNITY VALUE
A single annualised USD figure, digits only, e.g. 96000

## INTERNAL NOTES
Positioning guidance, objections to expect, language to avoid.`;
}

export type ParsedResearch = Partial<Record<ResearchFieldSpec["key"], string>>;

/**
 * Parses a "## TOKEN" structured response back into fields. Tolerant of markdown
 * bold, numbering and extra whitespace so a pasted Claude answer just works.
 */
export function parseResearchResponse(raw: string): ParsedResearch {
  const out: ParsedResearch = {};
  if (!raw.trim()) return out;

  const lines = raw.split(/\r?\n/);
  const norm = (s: string) =>
    s
      .replace(/^#+\s*/, "")
      .replace(/\*\*/g, "")
      .replace(/[:.]\s*$/, "")
      .trim()
      .toUpperCase();

  let current: ResearchFieldSpec | null = null;
  const buffer: string[] = [];

  const flush = () => {
    if (current) out[current.key] = buffer.join("\n").trim();
    buffer.length = 0;
  };

  for (const line of lines) {
    const candidate = norm(line);
    const match = RESEARCH_SPEC.find((f) => candidate === f.token);
    if (match) {
      flush();
      current = match;
      continue;
    }
    if (current) buffer.push(line);
  }
  flush();

  return out;
}

export function applyParsedResearch(prospect: Prospect, parsed: ParsedResearch) {
  const research = { ...prospect.research };
  let notes = prospect.notes;
  let whyNowNarrative = prospect.whyNowNarrative;
  let opportunityValue = prospect.opportunityValue;

  for (const spec of RESEARCH_SPEC) {
    const value = parsed[spec.key];
    if (!value) continue;
    if (spec.key === "internalNotes") notes = value;
    else if (spec.key === "whyNow") whyNowNarrative = value;
    else if (spec.key === "opportunityValue") {
      const digits = Number(value.replace(/[^0-9]/g, ""));
      if (digits) opportunityValue = digits;
    } else research[spec.key as keyof ResearchSection] = value;
  }

  return { research, notes, whyNowNarrative, opportunityValue };
}

export function researchFieldCount(parsed: ParsedResearch): number {
  return RESEARCH_SPEC.filter((s) => (parsed[s.key] ?? "").trim().length > 0).length;
}
