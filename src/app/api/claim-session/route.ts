// Claims a Claude Code session for a proposal, so the session's OTLP cost exports attribute to
// that proposal without proposal.id being baked into the static cloud environment. Called by the
// cloud session at the start of review work (scripts/claim-session.mjs in the review-author repo,
// which reads CLAUDE_CODE_SESSION_ID). Idempotent; re-claiming overwrites (last claim wins).
//
// Body: { proposalId: string, sessionId: string }
// Auth: Bearer CRON_SECRET.
import { NextRequest, NextResponse } from "next/server";
import { upsertSessionClaim } from "@/lib/db";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { proposalId?: string; sessionId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const proposalId = body.proposalId != null ? String(body.proposalId).trim() : "";
  const sessionId = body.sessionId?.trim();
  if (!/^\d+$/.test(proposalId) || !sessionId) {
    return NextResponse.json({ error: "proposalId (numeric) and sessionId are required" }, { status: 400 });
  }

  try {
    await upsertSessionClaim(sessionId, proposalId);
    return NextResponse.json({ ok: true, proposalId, sessionId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
