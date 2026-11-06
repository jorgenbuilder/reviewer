// Verification "needs you" reports (gh-verifier → portal). When a verify run fails for a
// reason only the operator can fix (provider out of credits, expired credential, auto-fix
// gave up, hash mismatch), gh-verifier posts a `needs_attention` verification-event with an
// LLM-written report. It is stored as a proposal_event whose detail is this JSON payload,
// rendered at /proposals/<id>/verification with a retry button.
import { getProposalEvents } from "./db";

export const NEEDS_ATTENTION_EVENT = "verification_needs_attention";
export const RETRY_REQUESTED_EVENT = "verification_retry_requested";
export const REPORT_MAX_LEN = 12000;

export type NeedsAttentionCause = "billing_or_auth" | "no_fix" | "gave_up" | "hash_mismatch" | "other";

export interface NeedsAttentionReport {
  cause: NeedsAttentionCause;
  /** One-line summary for the push body. */
  summary: string;
  /** Markdown: why it failed + what the operator needs to do. */
  report: string;
  runUrl?: string;
  /** Whether a plain retry can succeed once the operator acts (false for a hash mismatch). */
  retryable: boolean;
}

export interface VerificationReportView extends NeedsAttentionReport {
  reportedAt: string;
  /** Set when a retry was requested after this report. */
  retryRequestedAt: string | null;
  /** Set when a newer verification lifecycle event (started/verified/…) followed the report. */
  supersededBy: { type: string; at: string } | null;
}

export function parseReportDetail(detail: string | null): NeedsAttentionReport | null {
  if (!detail) return null;
  try {
    const r = JSON.parse(detail);
    if (typeof r.report !== "string") return null;
    return {
      cause: r.cause ?? "other",
      summary: String(r.summary ?? ""),
      report: r.report,
      runUrl: r.runUrl || undefined,
      retryable: r.retryable !== false,
    };
  } catch {
    return null;
  }
}

/** Latest needs-attention report for a proposal, with what happened after it. */
export async function getLatestVerificationReport(proposalId: string): Promise<VerificationReportView | null> {
  const events = await getProposalEvents({ proposalId, limit: 100 }); // newest first
  const idx = events.findIndex((e) => e.event_type === NEEDS_ATTENTION_EVENT);
  if (idx < 0) return null;
  const parsed = parseReportDetail(events[idx].detail);
  if (!parsed) return null;
  const newer = events.slice(0, idx);
  const retry = newer.filter((e) => e.event_type === RETRY_REQUESTED_EVENT).pop(); // oldest of the newer
  const later = newer
    .filter((e) => e.event_type.startsWith("verification_") && e.event_type !== RETRY_REQUESTED_EVENT)
    .pop();
  return {
    ...parsed,
    reportedAt: events[idx].created_at,
    retryRequestedAt: retry?.created_at ?? null,
    supersededBy: later ? { type: later.event_type, at: later.created_at } : null,
  };
}

/** Dispatch gh-verifier's verify.yml for one proposal. */
export async function dispatchVerify(proposalId: string): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return { ok: false, error: "GITHUB_TOKEN not configured" };
  const res = await fetch(
    "https://api.github.com/repos/jorgenbuilder/gh-verifier/actions/workflows/verify.yml/dispatches",
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github.v3+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: "main", inputs: { proposal_id: proposalId } }),
    }
  );
  if (!res.ok) return { ok: false, error: `GitHub ${res.status}: ${(await res.text()).slice(0, 200)}` };
  return { ok: true };
}
