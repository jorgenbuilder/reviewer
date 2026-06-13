// Receives verification lifecycle state pushed from gh-verifier (verify.yml + auto-fix.yml)
// and records it as a proposal_event (+ operator push for the noteworthy ones). This is how
// the app learns a verification failed and that the self-healing loop is iterating.
//
// Body: { proposalId, type: "started"|"failed"|"healing"|"gave_up", iteration?, detail?, runUrl? }
import { NextRequest, NextResponse } from "next/server";
import { recordEvent } from "@/lib/events";

const TYPES = new Set(["started", "failed", "healing", "gave_up"]);

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let proposalId: string, type: string, iteration: number | undefined, detail: string | undefined, runUrl: string | undefined;
  try {
    const b = await request.json();
    proposalId = String(b.proposalId);
    type = String(b.type);
    iteration = b.iteration != null ? Number(b.iteration) : undefined;
    detail = b.detail != null ? String(b.detail) : undefined;
    runUrl = b.runUrl != null ? String(b.runUrl) : undefined;
    if (!proposalId || proposalId === "undefined" || !TYPES.has(type)) throw new Error("missing/invalid proposalId or type");
  } catch (e) {
    return NextResponse.json({ error: "bad body: " + (e as Error).message }, { status: 400 });
  }

  // detail stored on the event; iteration folded in for the healing case
  const eventDetail = type === "healing" && iteration != null ? `iteration ${iteration}${detail ? ` — ${detail}` : ""}` : detail;

  // Push only the noteworthy transitions (started is log-only to avoid noise).
  let push: { title: string; body: string; url?: string } | undefined;
  if (type === "failed") push = { title: "⚠️ Verification failed", body: `#${proposalId}${detail ? `: ${detail}` : ""}`, url: runUrl };
  else if (type === "healing") push = { title: "🔧 Verification self-healing", body: `#${proposalId} failed — auto-fix iteration #${iteration ?? "?"}`, url: runUrl };
  else if (type === "gave_up") push = { title: "🛑 Verification gave up", body: `#${proposalId} needs manual review`, url: runUrl };

  await recordEvent(proposalId, `verification_${type}`, { detail: eventDetail, push });
  return NextResponse.json({ status: "recorded", type });
}
