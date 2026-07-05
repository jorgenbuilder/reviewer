// Self-healing backstop for canonical-forum-post detection. On a schedule, finds in-window
// proposals that still have no canonical thread and whose detection looks stalled, and fires
// a one-shot detection attempt for each. This is the durable safety net: it recovers loops
// that died for any reason (dead/rotated forum key, exhausted attempts, a lost QStash
// message, or a proposal seen during an outage) without operator intervention.
//
// Each sweep makes exactly ONE (one-shot) attempt per stalled proposal, so it never stacks
// overlapping self-rescheduling chains. A proposal that stays stalled past ESCALATE_MINUTES
// raises a one-time operator push, so a genuinely-stuck proposal (thread truly missing) is
// visible instead of retried silently forever.
import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { getStalledDetections } from "@/lib/db";
import { enqueueDetectionOnce } from "@/lib/forum-detect";
import { recordEvent } from "@/lib/events";

// A healthy loop finds the thread within a couple of attempts (minutes). Treat detection as
// stalled once a proposal has gone unresolved for this long since it was first seen.
const STALE_MINUTES = Number(process.env.DETECTION_STALE_MINUTES || 45);
// Past this age with still no canonical thread, escalate to a push — likely the forum thread
// was never posted, or something needs a human.
const ESCALATE_MINUTES = Number(process.env.DETECTION_ESCALATE_MINUTES || 360);

async function verifyQStash(signature: string | null, body: string): Promise<boolean> {
  const current = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const next = process.env.QSTASH_NEXT_SIGNING_KEY;
  if (!current || !next || !signature) return false;
  try {
    await new Receiver({ currentSigningKey: current, nextSigningKey: next }).verify({ signature, body });
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("upstash-signature");
  const authHeader = request.headers.get("authorization");
  const ok =
    (await verifyQStash(signature, body)) ||
    (!!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) ||
    !!request.headers.get("x-vercel-cron");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stalled = await getStalledDetections(STALE_MINUTES, 25);
  if (stalled.length === 0) return NextResponse.json({ status: "idle", stalled: 0 });

  let rearmed = 0;
  let escalated = 0;
  for (const p of stalled) {
    // One-shot re-arm — stagger to be gentle on the forum.
    await enqueueDetectionOnce(p.proposalId, rearmed * 15).catch(() => {});
    rearmed++;

    if (p.ageMinutes >= ESCALATE_MINUTES) {
      const did = await recordEvent(p.proposalId, "detection_stuck", {
        once: true,
        detail: `no canonical thread ${p.ageMinutes} min after first seen`,
        push: {
          title: "Canonical detection stuck",
          body: `#${p.proposalId}: still no forum thread after ${Math.round(p.ageMinutes / 60)}h`,
        },
      });
      if (did) escalated++;
    }
  }

  console.log(`[reconcile-detection] stalled=${stalled.length} re-armed=${rearmed} escalated=${escalated}`);
  return NextResponse.json({ status: "ok", stalled: stalled.length, rearmed, escalated });
}

// Vercel Cron issues GET.
export async function GET(request: NextRequest) {
  return POST(request);
}
