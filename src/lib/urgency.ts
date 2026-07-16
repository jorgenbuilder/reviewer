// Urgency extraction: pulls "when does DFINITY plan to vote" and "how urgent is this"
// out of a proposal's text (and, once detected, its canonical forum thread) with a cheap
// LLM call. The result is stored on proposals_seen and drives startling push notifications
// for urgent / voting-soon proposals.
//
// urgency is a probability in [0,1] (the model's judgment that the proposal needs fast
// reviewer attention), not a category — thresholding happens at notification time so the
// bar can move without re-extracting.
import Anthropic from "@anthropic-ai/sdk";

export const URGENCY_MODEL = process.env.URGENCY_MODEL || "claude-haiku-4-5";

export interface UrgencyExtraction {
  /** ISO 8601 UTC timestamp of the stated planned vote, or null if not stated. */
  plannedVoteAt: string | null;
  /** P(urgent) in [0,1]. */
  urgency: number;
  /** Verbatim quote(s) the extraction rests on, or null. */
  evidence: string | null;
}

export interface UrgencyInput {
  proposalId: string;
  title: string;
  summary: string;
  /** Proposal submission time — the reference point for resolving relative dates. */
  proposalTimestamp: Date | null;
  /** Text of canonical forum posts (first post + poster's follow-ups), when available. */
  forumPosts?: string[];
}

// JSON Schema for structured output. Numerical min/max constraints aren't supported by
// the API's schema subset, so urgency is clamped in code after parsing.
const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    planned_vote_at: {
      type: ["string", "null"],
      description:
        "ISO 8601 UTC timestamp when DFINITY (or the proposer) stated they plan to vote, else null",
    },
    urgency: {
      type: "number",
      description: "Probability in [0,1] that this proposal is urgent",
    },
    evidence: {
      type: ["string", "null"],
      description: "Short verbatim quote(s) supporting the extraction, else null",
    },
  },
  required: ["planned_vote_at", "urgency", "evidence"],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You extract voting-schedule and urgency signals from Internet Computer NNS governance proposals for a proposal reviewer who must decide how quickly to review.

You are given a proposal (title, summary, submission time) and sometimes posts from its forum discussion thread. Extract:

1. planned_vote_at — when DFINITY (or the proposer) has STATED they plan to vote on this proposal.
   - Only extract an explicitly stated voting intention (e.g. "DFINITY plans to vote on this proposal on Friday, June 20", "we will vote to adopt these proposals on Monday", "voting will take place the following Monday").
   - Resolve relative dates ("this Friday", "tomorrow", "the following Monday") against the reference date given in the input (the statement's publication time). Output ISO 8601 UTC.
   - If only a day is stated with no time, use 12:00:00Z on that day.
   - The standard NNS voting deadline (proposals execute after the voting period regardless) is NOT a planned vote — do not infer one. If no voting plan is stated anywhere, output null.

2. urgency — your probability (0 to 1) that this proposal is urgent, i.e. the reviewer should look at it sooner than the normal cadence. Calibration:
   - 0.9-1.0: explicit urgency, an incident/outage being fixed, or a stated vote less than ~24h away. If the text literally labels the change urgent ("urgent", "why this is urgent", "hotfix", "critical fix", "security fix", "as soon as possible", "expedited"), output at least 0.9 — the author's own urgency label always wins.
   - 0.75-0.85: strong time pressure stated in the text short of an explicit urgency label (e.g. a dependency deadline, a halted/stuck canister being unblocked).
   - 0.5-0.65: a stated plan to vote within ~2 days of the statement, or a fix for a live user-facing bug whose author does NOT state urgency (bug fixes without an urgency label cap at 0.65).
   - 0.3-0.5: mild time sensitivity (vote planned ~3-5 days out, coordination with an external event). A routine batch voting announcement (e.g. a weekly "NNS Updates" thread stating DFINITY will vote a few days out) belongs here and contributes the SAME score to every proposal it covers — only urgency in the proposal's own change justifies going higher.
   - 0.0-0.2: routine upgrades, elections, config changes with no stated schedule or urgency.

3. evidence — the shortest verbatim quote(s) from the input that justify planned_vote_at and/or an urgency above 0.3. Copy character-for-character from the input; never translate, reformat, or paraphrase. Null if nothing to quote.

Never fabricate: if the text says nothing about voting plans or urgency, return null / a low probability. Base the extraction only on the provided text.`;

// Truncation caps keep the call cheap; signals live near the top of these texts.
const MAX_SUMMARY_CHARS = 12000;
const MAX_FORUM_CHARS = 8000;

export function buildExtractionInput(input: UrgencyInput): string {
  const parts = [
    `Proposal #${input.proposalId}`,
    `Title: ${input.title}`,
    `Submitted (reference date for relative dates): ${
      input.proposalTimestamp ? input.proposalTimestamp.toISOString() : "unknown"
    }`,
    ``,
    `--- Proposal summary ---`,
    (input.summary || "(empty)").slice(0, MAX_SUMMARY_CHARS),
  ];
  for (const [i, post] of (input.forumPosts || []).entries()) {
    parts.push(``, `--- Forum post ${i + 1} ---`, post.slice(0, MAX_FORUM_CHARS));
  }
  return parts.join("\n");
}

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic(); // ANTHROPIC_API_KEY
  return _client;
}

/**
 * Run the extraction. Throws on API failure — callers treat extraction as best-effort
 * and must not let a failure break proposal processing.
 */
export async function extractUrgency(input: UrgencyInput): Promise<UrgencyExtraction> {
  const response = await client().messages.create({
    model: URGENCY_MODEL,
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildExtractionInput(input) }],
    output_config: {
      format: { type: "json_schema", schema: EXTRACTION_SCHEMA as unknown as Record<string, unknown> },
    },
  });

  const text = response.content.find((b) => b.type === "text")?.text;
  if (!text) throw new Error(`urgency extraction returned no text (stop: ${response.stop_reason})`);
  const parsed = JSON.parse(text) as {
    planned_vote_at: string | null;
    urgency: number;
    evidence: string | null;
  };

  // Validate/normalize: clamp probability, drop unparseable timestamps.
  let plannedVoteAt: string | null = null;
  if (parsed.planned_vote_at) {
    const d = new Date(parsed.planned_vote_at);
    if (!isNaN(d.getTime())) plannedVoteAt = d.toISOString();
  }
  const urgency = Math.min(1, Math.max(0, Number(parsed.urgency) || 0));
  return { plannedVoteAt, urgency, evidence: parsed.evidence || null };
}

// --- Notification shaping -------------------------------------------------------------
// Pure helpers live in urgency-shared.ts (client-safe, no SDK import); re-exported here
// so server call sites keep a single import.
export { startlingLevel, describePlannedVote, type StartlingLevel } from "./urgency-shared";
