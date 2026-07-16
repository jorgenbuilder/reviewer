// Pure urgency helpers shared by server code and client components.
// (Deliberately free of the Anthropic SDK import that lives in lib/urgency.ts,
// so client bundles can use these without dragging the SDK along.)

export type StartlingLevel = "urgent" | "vote-soon" | null;

export const URGENT_THRESHOLD = 0.7;
const VOTE_SOON_WINDOW_MS = 48 * 3600 * 1000;

/**
 * How startling should notifications/UI about this proposal be?
 *  - 'urgent'    — extractor is confident the proposal is urgent
 *  - 'vote-soon' — a stated DFINITY vote is within the next 48h (and not long past)
 *  - null        — normal
 */
export function startlingLevel(
  urgency: number | null | undefined,
  plannedVoteAt: string | null | undefined,
  now: Date = new Date()
): StartlingLevel {
  if (urgency != null && urgency >= URGENT_THRESHOLD) return "urgent";
  if (plannedVoteAt) {
    const t = new Date(plannedVoteAt).getTime();
    const delta = t - now.getTime();
    if (delta <= VOTE_SOON_WINDOW_MS && delta > -6 * 3600 * 1000) return "vote-soon";
  }
  return null;
}

/** Compact human phrasing of a planned vote time, for notification bodies. */
export function describePlannedVote(plannedVoteAt: string, now: Date = new Date()): string {
  const t = new Date(plannedVoteAt);
  const hours = Math.round((t.getTime() - now.getTime()) / 3600000);
  const when = t.toISOString().slice(0, 16).replace("T", " ") + " UTC";
  if (hours <= 0) return `DFINITY planned to vote ${when}`;
  if (hours < 48) return `DFINITY plans to vote in ~${hours}h (${when})`;
  return `DFINITY plans to vote ${when}`;
}

/** True iff the stated vote time is still ahead of us. */
export function isFutureVote(plannedVoteAt: string | null | undefined, now: Date = new Date()): boolean {
  return !!plannedVoteAt && new Date(plannedVoteAt).getTime() > now.getTime();
}

/** True iff `iso` is within `maxAgeMs` of now. False for null/unparseable. */
export function isRecent(iso: string | null | undefined, maxAgeMs: number, now: Date = new Date()): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return !isNaN(t) && now.getTime() - t <= maxAgeMs;
}

/** Very short vote-time label for UI chips: "vote in 14h", "vote Jul 21", "voted". */
export function shortVoteLabel(plannedVoteAt: string, now: Date = new Date()): string {
  const t = new Date(plannedVoteAt);
  const ms = t.getTime() - now.getTime();
  if (ms < -6 * 3600 * 1000) return "voted";
  const hours = Math.round(ms / 3600000);
  if (hours <= 0) return "vote now";
  if (hours < 48) return `vote in ${hours}h`;
  return `vote ${t.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}
