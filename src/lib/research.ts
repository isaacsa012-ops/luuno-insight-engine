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
1. Research the company across every public surface, not just the website: Google Business Profile and the individual reviews (read the negative ones closely), Yelp, BBB, Facebook, Instagram, TikTok, YouTube, LinkedIn (company page AND the owner/leaders personally, including their recent posts), Indeed/ZipRecruiter/Glassdoor job posts and employee reviews, local news and trade press, permits or registrations where visible, and any tooling footprints on the site (booking widgets, chat widgets, form providers, payment processors). Follow the owner by name once identified - their own posts are often the best Why Now signal. Cross-check data-broker claims (ZoomInfo, PitchBook) against primary sources before trusting them; same-name companies get conflated.
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
FORMAT: businessSummary and internalNotes read as short prose. Every other research field is written as short "- " bullet lines, one fact per line, so it scans in the dashboard - lead with the fact, follow with the evidence in the same line.
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

Also include a "contact" key:
{ "phone": "", "email": "", "emailVerified": false, "linkedin": "" }
- phone: the company's published main line, digits as published.
- email: the single best outreach address found. Set emailVerified to true ONLY
  if the address appears verbatim on an official primary source (their website,
  BBB listing, government vendor profile). Pattern-inferred or data-broker
  addresses stay emailVerified: false.
- linkedin: URL of the decision maker's personal profile if found, else the
  company page URL.
Leave any unknown value as an empty string - never guess.

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

export interface ParsedContact {
  phone?: string;
  email?: string;
  emailVerified?: boolean;
  linkedin?: string;
}

export type ParsedResearch = Partial<Record<ResearchFieldSpec["key"], string>> & {
  audit?: Partial<Record<AuditSectionKey, Partial<AuditItem>>>;
  videoKit?: ParsedVideoKit;
  contact?: ParsedContact;
};

function parseContactPayload(value: unknown): ParsedContact | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const out: ParsedContact = {};
  for (const key of ["phone", "email", "linkedin"] as const) {
    const text = record[key];
    if (typeof text === "string" && text.trim()) out[key] = text.trim();
  }
  if (typeof record.emailVerified === "boolean") out.emailVerified = record.emailVerified;
  return Object.keys(out).length ? out : undefined;
}

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
  const contact = parseContactPayload(record.contact);
  if (contact) out.contact = contact;
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

  // Seed diagram nodes from the parsed tech stack so the Current vs Future
  // view shows THEIR systems the moment research lands. Only when the
  // prospect has no nodes yet — manual node work is never overwritten.
  let currentOps = prospect.currentOps;
  if (!currentOps.length && parsed.currentTechnology) {
    currentOps = parsed.currentTechnology
      .split("\n")
      .map((l) => l.replace(/^[-*\u2022]?\s*\d*[.)]?\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 6)
      .map((line, i) => {
        const cut = line.split(/[:\u2013\u2014(]|,\s|\s-\s/)[0].trim();
        const label = (cut.length >= 3 && cut.length <= 40 ? cut : line.slice(0, 40)).trim();
        return {
          id: `ops-${i}-${Date.now().toString(36)}`,
          label,
          sublabel: line.length > label.length ? line.slice(label.length).replace(/^[\s:\u2013\u2014(-]+/, "").slice(0, 60) : "",
        };
      });
  }

  // The Overview/Outreach screens read the top-level owner field, which manual
  // entry owns. When it's still empty, seed it with the name portion of the
  // parsed decision maker (text before the first comma/paren/dash).
  let owner = prospect.owner;
  if (!owner.trim() && parsed.decisionMaker) {
    const name = parsed.decisionMaker.split(/[,(\u2013\u2014-]/)[0].trim();
    if (name && name.length <= 60 && !/not verified/i.test(name)) owner = name;
  }

  // Header contact fields. Phone and LinkedIn fill whenever empty. Email is
  // deliberately stricter: it only lands in the header - the field the Email
  // tab sends to - when the research marks it VERIFIED. Unverified candidates
  // stay in the decisionMaker text where they read as "check first".
  let phone = prospect.phone;
  let email = prospect.email;
  let linkedin = prospect.linkedin;
  if (parsed.contact) {
    if (!phone.trim() && parsed.contact.phone) phone = parsed.contact.phone;
    if (!linkedin.trim() && parsed.contact.linkedin) linkedin = parsed.contact.linkedin;
    if (!email.trim() && parsed.contact.email && parsed.contact.emailVerified === true) {
      email = parsed.contact.email;
    }
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

  return { research, notes, whyNowNarrative, opportunityValue, audit, owner, currentOps, phone, email, linkedin };
}

/** Count of audit sections the parse populated — for the success toast. */
export function parsedAuditSectionCount(parsed: ParsedResearch): number {
  return parsed.audit ? Object.keys(parsed.audit).length : 0;
}

export function researchFieldCount(parsed: ParsedResearch): number {
  return RESEARCH_SPEC.filter((s) => (parsed[s.key] ?? "").trim().length > 0).length;
}

/**
 * Default outreach body. Lives here (not in the component) so the preview,
 * the copy button and the settings default all share one source of truth.
 */
export const DEFAULT_EMAIL_TEMPLATE = `Hi {{firstName}},

I spent some time looking at how {{company}} runs today{{industryClause}}. The thing that stood out: {{bottleneck}}.

I recorded a short walkthrough for you and attached a written audit — nine sections covering visibility, lead capture, sales process and operations, with the evidence behind each finding. No pitch, just what we found.

If any of it lands, I'd genuinely enjoy talking it through: {{bookingUrl}}

— {{senderName}}, {{senderCompany}}
{{website}}`;

/**
 * The send-ready outreach email. Plain text — pastes cleanly into Gmail.
 * Body comes from the editable template in settings; tokens are filled from
 * the prospect's parsed research, so one template personalises per company.
 */
export function buildOutreachEmail(
  prospect: Prospect,
  settings: {
    senderName: string;
    senderCompany: string;
    websiteUrl: string;
    bookingUrl: string;
    emailTemplate?: string;
  },
): { subject: string; body: string } {
  const firstName = (prospect.owner || "there").split(/\s+/)[0];
  const subject = prospect.outreachAngle
    ? `${prospect.company}: ${prospect.outreachAngle}`
    : `A short systems teardown for ${prospect.company}`;
  const rawBottleneck =
    prospect.research.bottlenecks
      .split("\n")
      .find((l) => l.trim())
      ?.replace(/^[-*\u2022]?\s*\d*[.)]?\s*/, "")
      .replace(/\.$/, "") ?? "a coordination step that is still handled by hand";
  const bottleneck = rawBottleneck.charAt(0).toLowerCase() + rawBottleneck.slice(1);

  const tokens: Record<string, string> = {
    firstName,
    owner: prospect.owner || "there",
    company: prospect.company,
    industryClause: prospect.industry
      ? ` compared to other ${prospect.industry.toLowerCase()} operators`
      : "",
    bottleneck,
    whyNow: prospect.whyNowNarrative,
    bookingUrl: settings.bookingUrl,
    website: settings.websiteUrl,
    senderName: settings.senderName,
    senderCompany: settings.senderCompany,
  };

  const template = settings.emailTemplate?.trim() ? settings.emailTemplate : DEFAULT_EMAIL_TEMPLATE;
  const body = template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => tokens[key] ?? "");
  return { subject, body };
}
