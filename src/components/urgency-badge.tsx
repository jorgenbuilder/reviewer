"use client";

// Urgency surfaces for the extracted planned_vote_at / urgency fields
// (lib/urgency.ts): a compact chip for list rows and a row for the proposal
// detail page. Levels derive at render time, so a "vote soon" chip ages out
// on its own once the vote passes, and an "urgent" flag stops shouting once
// the proposal's vote has closed.

import { AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  startlingLevel,
  shortVoteLabel,
  describePlannedVote,
  isFutureVote,
  isRecent,
  formatVoteTimeUTC,
  formatDuration,
  msUntil,
} from "@/lib/urgency-shared";

export interface UrgencyInfo {
  urgency: number | null;
  plannedVoteAt: string | null;
  evidence?: string | null;
}

/**
 * Compact chip for list rows. Renders only actionable states — urgent (while
 * the proposal is fresh), an upcoming vote — so a quiet list means nothing
 * needs attention. `proposalTimestamp` stale-guards the urgent chip: an
 * urgent-flagged proposal whose voting window has long passed shouldn't
 * alarm forever.
 */
const URGENT_CHIP_MAX_AGE_MS = 7 * 24 * 3600 * 1000;

export function UrgencyChip({
  urgency,
  plannedVoteAt,
  proposalTimestamp,
  className,
}: UrgencyInfo & { proposalTimestamp?: string | null; className?: string }) {
  const level = startlingLevel(urgency, plannedVoteAt);
  const base =
    "inline-flex shrink-0 items-center gap-1 border px-1.5 py-px font-mono text-[0.65rem] font-bold uppercase tracking-wide";

  if (level === "urgent") {
    const fresh = proposalTimestamp == null || isRecent(proposalTimestamp, URGENT_CHIP_MAX_AGE_MS);
    if (!fresh) return null;
    return (
      <span
        className={cn(base, "border-destructive/60 bg-destructive/10 text-destructive", className)}
        title={`Urgent (P=${urgency?.toFixed(2)})`}
      >
        <AlertTriangle className="h-3 w-3" aria-hidden />
        urgent
      </span>
    );
  }
  if (level === "vote-soon") {
    return (
      <span
        className={cn(
          base,
          "border-amber-500/60 bg-amber-500/10 text-amber-600 dark:text-amber-400",
          className
        )}
        title={describePlannedVote(plannedVoteAt!)}
      >
        <Clock className="h-3 w-3" aria-hidden />
        {shortVoteLabel(plannedVoteAt!)}
      </span>
    );
  }
  // Future vote beyond the 48h window: quiet informational chip.
  if (isFutureVote(plannedVoteAt)) {
    return (
      <span
        className={cn(base, "border-border text-muted-foreground", className)}
        title={describePlannedVote(plannedVoteAt!)}
      >
        <Clock className="h-3 w-3" aria-hidden />
        {shortVoteLabel(plannedVoteAt!)}
      </span>
    );
  }
  return null;
}

/**
 * Minimal urgency block for the detail page's meta panel, styled to match the
 * sidebar's status labels: a color-coded level word (urgent / vote soon /
 * normal), then one fact line — countdown to the stated DFINITY vote while the
 * proposal is open, or proposal→execution duration once it's done. Evidence
 * lives in the tooltip.
 */
export function UrgencyMeta({
  urgency,
  plannedVoteAt,
  evidence,
  voteStatus,
  submittedAt,
  executedAt,
}: UrgencyInfo & {
  voteStatus?: "open" | "adopt" | "reject";
  submittedAt?: string | null;
  executedAt?: string | null;
}) {
  const voteOpen = voteStatus == null || voteStatus === "open";
  const level = voteOpen ? startlingLevel(urgency, plannedVoteAt) : null;
  const m =
    level === "urgent"
      ? { text: "urgent", cls: "text-destructive" }
      : level === "vote-soon"
        ? { text: "vote soon", cls: "text-amber-500" }
        : { text: "normal", cls: "text-muted-foreground" };

  // One fact line: executed proposals show how long submission → execution
  // took; open ones count down to the stated DFINITY vote.
  let fact: string | null = null;
  if (executedAt && submittedAt) {
    fact = `executed ${formatDuration(new Date(executedAt).getTime() - new Date(submittedAt).getTime())} after proposal`;
  } else if (plannedVoteAt) {
    const ms = msUntil(plannedVoteAt);
    fact =
      ms > 0
        ? `DFINITY votes in ${formatDuration(ms)} · ${formatVoteTimeUTC(plannedVoteAt)}`
        : `DFINITY vote was ${formatVoteTimeUTC(plannedVoteAt)}`;
  }

  return (
    <div>
      <span
        className={cn("font-mono text-xs font-bold uppercase tracking-wide", m.cls)}
        title={evidence ? `P=${urgency?.toFixed(2)} — “${evidence}”` : urgency != null ? `P=${urgency.toFixed(2)}` : undefined}
      >
        {m.text}
      </span>
      {fact && <p className="mt-1 font-mono text-[0.65rem] text-muted-foreground">{fact}</p>}
    </div>
  );
}
