"use client";

// Urgency surfaces for the extracted planned_vote_at / urgency fields
// (lib/urgency.ts): a compact chip for list rows and a banner strip for the
// proposal detail page. Both derive their level at render time so a
// "vote soon" chip ages out on its own once the vote passes.

import { AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { startlingLevel, shortVoteLabel, describePlannedVote, isFutureVote } from "@/lib/urgency-shared";

export interface UrgencyInfo {
  urgency: number | null;
  plannedVoteAt: string | null;
  evidence?: string | null;
}

/** Compact chip for list rows. Renders nothing for normal proposals. */
export function UrgencyChip({ urgency, plannedVoteAt, className }: UrgencyInfo & { className?: string }) {
  const level = startlingLevel(urgency, plannedVoteAt);
  const base =
    "inline-flex shrink-0 items-center gap-1 border px-1.5 py-px font-mono text-[0.65rem] font-bold uppercase tracking-wide";

  if (level === "urgent") {
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
 * Full-width strip for the proposal detail page. Renders only when the
 * proposal is urgent, has an upcoming vote, or carries urgency evidence
 * worth reading.
 */
export function UrgencyBanner({ urgency, plannedVoteAt, evidence }: UrgencyInfo) {
  const level = startlingLevel(urgency, plannedVoteAt);
  const futureVote = isFutureVote(plannedVoteAt);
  if (!level && !futureVote) return null;

  const tone =
    level === "urgent"
      ? "border-destructive/60 bg-destructive/10 text-destructive"
      : level === "vote-soon"
        ? "border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-400"
        : "border-border bg-muted/40 text-muted-foreground";
  const Icon = level === "urgent" ? AlertTriangle : Clock;

  return (
    <div className={cn("flex items-start gap-2 border-b px-3 py-2", tone)} role={level ? "alert" : undefined}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 font-mono text-xs leading-relaxed">
        <span className="font-bold uppercase tracking-wide">
          {level === "urgent" ? "Urgent" : "Vote scheduled"}
        </span>
        {plannedVoteAt && <span> — {describePlannedVote(plannedVoteAt)}</span>}
        {level === "urgent" && urgency != null && (
          <span className="text-[0.9em] opacity-70"> (P={urgency.toFixed(2)})</span>
        )}
        {evidence && (
          <span className="block truncate italic opacity-80" title={evidence}>
            &ldquo;{evidence}&rdquo;
          </span>
        )}
      </div>
    </div>
  );
}
