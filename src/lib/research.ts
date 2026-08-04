import { AUDIT_SECTIONS } from "./domain";
import type { Audit, AuditItem, AuditSectionKey, Prospect, ResearchSection } from "./types";

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
  const known = [
    p.owner ? `Owner / contact: ${p.owner}${p.email ? ` (${p.email})` : ""}` : null,
    p.phone ? `Phone: ${p.phone}` : null,
    p.employees ? `Approx headcount: ${p.employees}` : null,
    p.techStack.length ? `Known tech: ${p.techStack.join(", ")}` : null,
    p.whyNow.length ? `Observed signals: ${p.whyNow.join(", ")}` : null,
    p.notes.trim() ? `Existing internal notes: ${p.notes.trim()}` : null,
  ].filter(Boolean);

  return `You are a business systems analyst producing an operational intelligence brief for Luuno.

COMPANY: ${p.company}
WEBSITE: ${p.website || "unknown"}
INDUSTRY: ${p.industry || "unknown"}
LOCATION: ${p.location || "unknown"}

KNOWN INFORMATION
${known.length ? known.map((k) => `- ${k}`).join("\n") : "- None recorded yet"}

RESEARCH INSTRUCTIONS
1. Research the company using public sources: website, maps listings, reviews, job posts, socials, press.
2. Be specific and evidence-led. Label every assumption as an assumption.
3. Describe how the business actually operates today, not how it markets itself.
4. Identify where throughput is constrained by a person or a manual step.
5. Write in plain operator language. No marketing tone. Never mention AI.

OUTPUT FORMAT
Return ONE JSON object and nothing else — no prose, no code fence commentary.
Use exactly these keys, all values strings except opportunityValue (number):

{
  "businessSummary": "",
  "customerJourney": "",
  "decisionMaker": "",
  "currentTechnology": "",
  "bottlenecks": "",
  "opportunities": "",
  "whyNow": "",
  "opportunityValue": 0,
  "internalNotes": ""
}

Field guidance:
- businessSummary: what it does, how it makes money, scale, market position.
- customerJourney: the real path from first contact to delivered outcome.
- decisionMaker: name, role, priorities, most credible way to reach them.
- currentTechnology: systems in use, how they connect, where data is re-keyed.
- bottlenecks: numbered lines; name the constrained step and who owns it.
- opportunities: numbered lines; each states the measurable outcome unlocked.
- whyNow: the specific trigger event, the evidence, and how recent it is. If there
  is no genuine signal, write "No strong signal found" — do not manufacture one.
- opportunityValue: single annualised USD figure, digits only, e.g. 96000.
- internalNotes: positioning, objections to expect, language to avoid, and the
  basis for the opportunity value.

In the same JSON object, also include an "audit" key covering these nine sections:
${AUDIT_SECTIONS.map((s) => `- "${s.key}": ${s.brief}`).join("\n")}

Each section is an object with four string fields:
{ "observation": "", "evidence": "", "opportunity": "", "recommendation": "" }
- observation: what is true today, stated concretely. If a section cannot be
  assessed from public evidence, write "Could not assess from public sources" and
  leave the other three fields empty.
- evidence: the specific thing observed — a page, review, form, or posting.
- opportunity: what improving this is worth to THIS business.
- recommendation: what Luuno would install or connect. Augment, never replace.
Aim for 2-4 sentences per field. One thin line reads as generic filler.

Finally include a "videoKit" key:
{ "theOneObservation": "", "whatToShowOnScreen": "", "openingLine": "", "curiosityClose": "" }
- theOneObservation: the single most compelling finding — visually demonstrable,
  specific enough that it could only apply to this company.
- whatToShowOnScreen: the exact page/review/form to screen-share.
- openingLine: one natural spoken sentence proving real research, no hype.
- curiosityClose: one spoken sentence pointing at the attached report without
  explaining it.

If no observation is specific enough for the videoKit, begin internalNotes with
"WEAK CANDIDATE — consider Tier D." An honest weak result beats a padded one.`;
}

export interface ParsedVideoKit {
  theOneObservation?: string;
  whatToShowOnScreen?: string;
  openingLine?: string;
  curiosityClose?: string;
}

export type ParsedResearch = Partial<Record<ResearchFieldSpec["key"], string>> & {
  audit?: Partial<Record<AuditSectionKey, Partial<AuditItem>>>;
  videoKit?: ParsedVideoKit;
};

const AUDIT_ITEM_FIELDS = ["observation", "evidence", "opportunity", "recommendation"] as const;

/** Pulls the nine audit sections out of a parsed JSON payload, tolerating partial data. */
function parseAuditPayload(value: unknown): ParsedResearch["audit"] | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const out: NonNullable<ParsedResearch["audit"]> = {};
  for (const section of AUDIT_SECTIONS) {
    const raw = record[section.key];
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const parsed: Partial<AuditItem> = {};
    for (const field of AUDIT_ITEM_FIELDS) {
      const text = item[field];
      if (typeof text === "string" && text.trim()) parsed[field] = text.trim();
    }
    if (Object.keys(parsed).length) out[section.key] = parsed;
  }
  return Object.keys(out).length ? out : undefined;
}

function parseVideoKitPayload(value: unknown): ParsedVideoKit | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const out: ParsedVideoKit = {};
  for (const key of ["theOneObservation", "whatToShowOnScreen", "openingLine", "curiosityClose"] as const) {
    const text = record[key];
    if (typeof text === "string" && text.trim()) out[key] = text.trim();
  }
  return Object.keys(out).length ? out : undefined;
}

/** Extracts the first balanced JSON object from a response, ignoring fences and prose. */
function extractJsonObject(raw: string): unknown | null {
  const start = raw.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < raw.length; i += 1) {
    const ch = raw[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(raw.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function fromJson(raw: string): ParsedResearch | null {
  const obj = extractJsonObject(raw);
  if (!obj || typeof obj !== "object") return null;
  const record = obj as Record<string, unknown>;
  const out: ParsedResearch = {};
  for (const spec of RESEARCH_SPEC) {
    const value = record[spec.key];
    if (value === undefined || value === null) continue;
    const text = Array.isArray(value)
      ? value.map((v) => String(v)).join("\n")
      : typeof value === "object"
        ? JSON.stringify(value, null, 2)
        : String(value);
    if (text.trim()) out[spec.key] = text.trim();
  }
  const audit = parseAuditPayload(record.audit);
  if (audit) out.audit = audit;
  const videoKit = parseVideoKitPayload(record.videoKit);
  if (videoKit) out.videoKit = videoKit;
  return Object.keys(out).length ? out : null;
}

/**
 * Parses a Claude response into fields. JSON is the contract; the legacy
 * "## TOKEN" markdown format is still accepted as a fallback.
 */
export function parseResearchResponse(raw: string): ParsedResearch {
  const out: ParsedResearch = {};
  if (!raw.trim()) return out;

  const json = fromJson(raw);
  if (json) return json;

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

  // Merge parsed audit sections. Only fields the response actually filled are
  // overwritten, so manual edits to untouched fields survive a re-parse.
  const audit: Audit = { ...prospect.audit };
  if (parsed.audit) {
    for (const section of AUDIT_SECTIONS) {
      const incoming = parsed.audit[section.key];
      if (!incoming) continue;
      audit[section.key] = { ...audit[section.key], ...incoming };
    }
  }

  // videoKit has no fields of its own in the app yet; preserve it in notes so
  // the video script skeleton is never lost.
  if (parsed.videoKit) {
    const kit = parsed.videoKit;
    const block = [
      "— VIDEO KIT —",
      kit.theOneObservation ? `The one observation: ${kit.theOneObservation}` : null,
      kit.whatToShowOnScreen ? `Show on screen: ${kit.whatToShowOnScreen}` : null,
      kit.openingLine ? `Opening line: ${kit.openingLine}` : null,
      kit.curiosityClose ? `Curiosity close: ${kit.curiosityClose}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    notes = notes.trim() ? `${notes.trim()}\n\n${block}` : block;
  }

  return { research, notes, whyNowNarrative, opportunityValue, audit };
}

/** Count of audit sections the parse populated — for the success toast. */
export function parsedAuditSectionCount(parsed: ParsedResearch): number {
  return parsed.audit ? Object.keys(parsed.audit).length : 0;
}

export function researchFieldCount(parsed: ParsedResearch): number {
  return RESEARCH_SPEC.filter((s) => (parsed[s.key] ?? "").trim().length > 0).length;
}
