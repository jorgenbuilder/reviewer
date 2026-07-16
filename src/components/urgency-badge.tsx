"use client";

// Urgency surfaces for the extracted planned_vote_at / urgency fields
// (lib/urgency.ts): a compact chip for list rows and a row for the proposal
// detail page. Levels derive at render time, so a "vote soon" chip ages out
// on its own once the vote passes, and an "urgent" flag stops shouting once
// the proposal's vote has closed.

import { AlertTriangle, Clock, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  startlingLevel,
  shortVoteLabel,
  describePlannedVote,
  isFutureVote,
  isRecent,
  URGENT_THRESHOLD,
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
 * Urgency row for the proposal detail page — always visible when extraction
 * data exists, so the signal is discoverable even on quiet proposals. Loud
 * (red/amber) only while actionable: an urgent flag with the vote still open,
 * or an upcoming stated vote. Everything else renders as a muted fact row.
 */
export function UrgencyBanner({
  urgency,
  plannedVoteAt,
  evidence,
  voteStatus,
}: UrgencyInfo & { voteStatus?: "open" | "adopt" | "reject" }) {
  const voteOpen = voteStatus == null || voteStatus === "open";
  const level = voteOpen ? startlingLevel(urgency, plannedVoteAt) : null;
  const futureVote = isFutureVote(plannedVoteAt);
  if (urgency == null && !plannedVoteAt) return null;

  const loud = level !== null;
  const tone =
    level === "urgent"
      ? "border-destructive/60 bg-destructive/10 text-destructive"
      : level === "vote-soon"
        ? "border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-400"
        : "border-border bg-muted/40 text-muted-foreground";
  const Icon = level === "urgent" ? AlertTriangle : level === "vote-soon" || futureVote ? Clock : Gauge;

  const wasUrgent = !voteOpen && urgency != null && urgency >= URGENT_THRESHOLD;
  const label =
    level === "urgent"
      ? "Urgent"
      : level === "vote-soon" || futureVote
        ? "Vote scheduled"
        : wasUrgent
          ? "Was urgent"
          : "Urgency";

  return (
    <div className={cn("flex items-start gap-2 border-b px-3 py-2", tone)} role={loud ? "alert" : undefined}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 font-mono text-xs leading-relaxed">
        <span className="font-bold uppercase tracking-wide">{label}</span>
        {urgency != null && <span className="opacity-70"> P={urgency.toFixed(2)}</span>}
        {plannedVoteAt && <span> — {describePlannedVote(plannedVoteAt)}</span>}
        {evidence && (
          <span className="block truncate italic opacity-80" title={evidence}>
            &ldquo;{evidence}&rdquo;
          </span>
        )}
      </div>
    </div>
  );
}
