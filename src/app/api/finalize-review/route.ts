// Marks a review fully closed in the portal DB. Called by the author/web agent AFTER it has
// (1) posted the full review as a new reply in the canonical forum thread and (2) pushed it
// to the review-hub canister. Flips proposals_seen.review_post_state to 'final'.
//
// Body: { proposalId: string, postUrl: string }
// Auth: Bearer CRON_SECRET.
import { NextRequest, NextResponse } from "next/server";
import { markReviewFinalized } from "@/lib/db";
import { recordEvent } from "@/lib/events";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { proposalId?: string; postUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const proposalId = body.proposalId != null ? String(body.proposalId) : "";
  const postUrl = body.postUrl?.trim();
  if (!proposalId || !postUrl) {
    return NextResponse.json({ error: "proposalId and postUrl are required" }, { status: 400 });
  }

  try {
    await markReviewFinalized(proposalId, postUrl);
    // Push the operator a notification that the final review is live, linking
    // straight to the forum post (not the proposal page).
    await recordEvent(proposalId, "review_finalized", {
      detail: postUrl,
      once: true, // only the first finalize fires a push, not re-runs
      push: {
        title: `Review posted · #${proposalId}`,
        body: "Final review published to the forum. Tap to read it.",
        url: postUrl,
      },
    });
    return NextResponse.json({ ok: true, proposalId, state: "final", postUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
