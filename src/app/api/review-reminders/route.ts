// Periodic "review due soon" reminders. Runs hourly (Vercel cron). For each
// proposal the review hub still has PENDING for jorgenbuilder (assigned, not yet
// reviewed, before deadline), it fires a push as the deadline approaches at
// 2d / 1d / 12h / 4h / 1h remaining — each threshold at most once.
//
// Dedup is via proposal_events (`reminder_<h>h`, recorded with once:true). If a
// proposal first appears already deep inside the window, only the most urgent
// crossed threshold pushes; the larger ones are silently marked as sent so they
// don't backfire later.
import { NextResponse } from "next/server";
import { getHubStatusMap } from "@/lib/review-hub";
import { hasProposalEvent } from "@/lib/db";
import { recordEvent } from "@/lib/events";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") === `Bearer ${secret}`) return true;
  // Vercel cron and QStash both attach trusted headers.
  if (request.headers.get("x-vercel-cron")) return true;
  if (request.headers.get("upstash-signature")) return true;
  return false;
}

// Most urgent first, so the first not-yet-sent crossed threshold is the one we push.
const THRESHOLDS: { h: number; label: string }[] = [
  { h: 1, label: "1 hour" },
  { h: 4, label: "4 hours" },
  { h: 12, label: "12 hours" },
  { h: 24, label: "1 day" },
  { h: 48, label: "2 days" },
];

const HOUR_MS = 60 * 60 * 1000;

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const hub = await getHubStatusMap();
  let pushed = 0;
  let marked = 0;

  for (const [proposalId, status] of hub) {
    if (status.state !== "pending") continue;
    const remainingMs = status.deadlineMs - now;
    if (remainingMs <= 0) continue; // past deadline → handled as a miss, not a reminder

    const crossed = THRESHOLDS.filter((t) => remainingMs <= t.h * HOUR_MS); // ascending urgency
    if (crossed.length === 0) continue;

    let didPush = false;
    for (const t of crossed) {
      const eventType = `reminder_${t.h}h`;
      if (await hasProposalEvent(proposalId, eventType)) continue; // already handled this threshold
      if (!didPush) {
        // The most urgent newly-crossed threshold gets the actual push.
        await recordEvent(proposalId, eventType, {
          once: true,
          detail: t.label,
          push: {
            title: `Review due in ${t.label} · #${proposalId}`,
            body: "Assigned and not yet reviewed. Tap to review.",
          },
        });
        didPush = true;
        pushed++;
      } else {
        // Larger thresholds we skipped past — record so they never fire late.
        await recordEvent(proposalId, eventType, { once: true, detail: `${t.label} (skipped)` });
        marked++;
      }
    }
  }

  return NextResponse.json({ ok: true, pending: [...hub.values()].filter((s) => s.state === "pending").length, pushed, marked });
}
