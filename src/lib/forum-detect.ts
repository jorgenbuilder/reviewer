// Schedules canonical-forum-post detection as self-rescheduling QStash tasks.
//
// On proposal creation we enqueue attempt 0; each attempt that doesn't find the thread
// reschedules the next with an exponential-ish backoff, until found or attempts exhausted.
// QStash delivers to /api/detect-forum-post.
import { Client } from "@upstash/qstash";

// Adaptive canonical-detection cadence. The interval depends on the SITUATION:
//  - not verified yet  → relaxed backoff to a 30-min floor (we can't post anyway).
//  - verified, no post  → tight cadence to a 5-min floor (only the forum post is missing,
//    so catch it fast). The gh-verifier completion callback flips us into this mode.
// Both converge to a steady-state floor (the durable backstop loop).
const NORMAL_BACKOFF = [60, 300, 900, 1800];
const NORMAL_FLOOR = 1800; // 30 min
const VERIFIED_BACKOFF = [60, 60, 120, 120, 300];
const VERIFIED_FLOOR = 300; // 5 min
// Generous lifetime cap so the loop eventually stops for a proposal that never gets a thread.
export const MAX_DETECT_ATTEMPTS = 240;

function nextDelaySeconds(attempt: number, verified: boolean): number {
  const table = verified ? VERIFIED_BACKOFF : NORMAL_BACKOFF;
  const floor = verified ? VERIFIED_FLOOR : NORMAL_FLOOR;
  return attempt < table.length ? table[attempt] : floor;
}

function appUrl(): string {
  const u =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  if (!u) throw new Error("NEXT_PUBLIC_APP_URL / VERCEL_URL not set");
  return u.replace(/\/+$/, "");
}

let _client: Client | null = null;
function client(): Client {
  if (!_client) {
    const token = process.env.QSTASH_TOKEN;
    if (!token) throw new Error("QSTASH_TOKEN not set");
    _client = new Client({ token });
  }
  return _client;
}

/**
 * Schedule detection attempt `attempt` (0-based) for a proposal via QStash.
 * Returns false (without enqueueing) when attempts are exhausted.
 */
export async function scheduleDetection(proposalId: string, attempt: number, verified = false): Promise<boolean> {
  if (attempt >= MAX_DETECT_ATTEMPTS) return false;
  await client().publishJSON({
    url: `${appUrl()}/api/detect-forum-post`,
    body: { proposalId, attempt },
    delay: nextDelaySeconds(attempt, verified),
  });
  return true;
}

// Enqueue the verification-note review check for a proposal (idempotent; the checker
// re-validates all gates and no-ops if not ready). Used opportunistically when a canonical
// thread lands, and by the scheduled reconciler.
export async function enqueueReviewCheck(proposalId: string, delaySeconds = 0): Promise<void> {
  await client().publishJSON({
    url: `${appUrl()}/api/review-verified-proposal`,
    body: { proposalId },
    delay: delaySeconds,
  });
}
