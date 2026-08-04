import { createServerFn } from "@tanstack/react-start";
import { AUDIT_SECTIONS } from "./domain";
import type { Prospect, WorkspaceSettings } from "./types";

/**
 * In-dashboard assistant. Runs ONLY on the server: the Anthropic API key is
 * read from the server environment (ANTHROPIC_API_KEY — no VITE_ prefix, so
 * it is never bundled into browser code).
 *
 * The current prospect's full record is serialized into the system prompt, so
 * the assistant answers from the actual research, audit and pipeline state.
 */

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

const MODEL = "claude-sonnet-4-6";

function prospectBrief(p: Prospect): string {
  const audit = AUDIT_SECTIONS.map((s) => {
    const item = p.audit[s.key];
    if (!item.observation.trim()) return null;
    return `${s.label}:\n  observation: ${item.observation}\n  evidence: ${item.evidence}\n  opportunity: ${item.opportunity}\n  recommendation: ${item.recommendation}`;
  })
    .filter(Boolean)
    .join("\n");
  const pipeline = Object.entries(p.pipeline)
    .map(([k, v]) => `${k}=${v ? "done" : "pending"}`)
    .join(", ");
  return [
    `COMPANY: ${p.company}`,
    `Industry: ${p.industry} · Location: ${p.location} · Website: ${p.website}`,
    `Owner/decision maker: ${p.owner || "unknown"} · Email: ${p.email || "unknown"}`,
    `Status: ${p.status} · Opportunity value: $${p.opportunityValue}`,
    `Why now: ${p.whyNowNarrative}`,
    `RESEARCH`,
    `Business summary: ${p.research.businessSummary}`,
    `Customer journey: ${p.research.customerJourney}`,
    `Decision maker: ${p.research.decisionMaker}`,
    `Current technology: ${p.research.currentTechnology}`,
    `Bottlenecks: ${p.research.bottlenecks}`,
    `Opportunities: ${p.research.opportunities}`,
    `AUDIT (9 sections)`,
    audit || "No audit sections completed yet.",
    `PIPELINE: ${pipeline}`,
    `INTERNAL NOTES: ${p.notes}`,
  ].join("\n\n");
}

export const askAssistant = createServerFn({ method: "POST" })
  .validator(
    (input: {
      messages: AssistantMessage[];
      prospect: Prospect;
      settings: Pick<WorkspaceSettings, "senderName" | "senderCompany" | "bookingUrl" | "websiteUrl">;
    }) => input,
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        ok: false as const,
        text: "The assistant isn't configured yet: add ANTHROPIC_API_KEY in Vercel's environment variables (no VITE_ prefix) and redeploy.",
      };
    }

    const system = [
      `You are the in-dashboard analyst for ${data.settings.senderCompany || "Luuno"}, an intelligence-layer firm run by ${data.settings.senderName || "the operator"}. You are embedded in their internal prospecting tool.`,
      `Luuno's positioning: it installs a custom intelligence layer on top of a business's existing systems — augmenting, never replacing. Outreach style: evidence-led, specific, no hype, never mentions AI to prospects.`,
      `You have the full record for the prospect currently open. Answer from it. Be direct, concrete and brief — the operator is working, not reading essays. Use short bullet lines for lists. If the record lacks something, say so plainly rather than inventing it. When drafting outreach or scripts, ground every claim in the record's evidence.`,
      `Booking link: ${data.settings.bookingUrl} · Website: ${data.settings.websiteUrl}`,
      `PROSPECT RECORD:\n${prospectBrief(data.prospect)}`,
    ].join("\n\n");

    const trimmed = data.messages.slice(-12);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1200,
          system,
          messages: trimmed,
        }),
      });

      if (!res.ok) {
        const detail = await res.text();
        const hint = res.status === 401
          ? "The API key was rejected — check ANTHROPIC_API_KEY in Vercel."
          : res.status === 429
            ? "Rate limited — wait a moment and try again."
            : `API error ${res.status}.`;
        console.error("assistant api error", res.status, detail.slice(0, 300));
        return { ok: false as const, text: hint };
      }

      const payload = (await res.json()) as {
        content?: { type: string; text?: string }[];
      };
      const text = (payload.content ?? [])
        .filter((b) => b.type === "text" && b.text)
        .map((b) => b.text)
        .join("\n")
        .trim();
      return { ok: true as const, text: text || "No response content returned." };
    } catch (err) {
      console.error("assistant call failed", err);
      return { ok: false as const, text: "Couldn't reach the assistant service. Try again." };
    }
  });
