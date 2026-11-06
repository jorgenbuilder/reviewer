// Receives verification lifecycle state pushed from gh-verifier (verify.yml + auto-fix.yml)
// and records it as a proposal_event (+ operator push for the noteworthy ones). This is how
// the app learns a verification failed and that the self-healing loop is iterating.
//
// Body: { proposalId, type: "started"|"failed"|"healing"|"gave_up"|"needs_attention", iteration?, detail?, runUrl? }
//
// needs_attention additionally takes { cause, summary, report, retryable } — an LLM-written
// "why it failed / what you need to do" report for a failure only the operator can fix. It
// pushes an urgent notification that opens /proposals/<id>/verification (report + retry button).
import { NextRequest, NextResponse } from "next/server";
import { recordEvent } from "@/lib/events";
import { NEEDS_ATTENTION_EVENT, REPORT_MAX_LEN, type NeedsAttentionReport } from "@/lib/verification-report";

const TYPES = new Set(["started", "failed", "healing", "gave_up", "needs_attention"]);
const CAUSES = new Set(["billing_or_auth", "no_fix", "gave_up", "hash_mismatch", "other"]);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://proposal-reviewer-portal.vercel.app";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let proposalId: string, type: string, iteration: number | undefined, detail: string | undefined, runUrl: string | undefined;
  let b: Record<string, unknown>;
  try {
    b = await request.json();
    proposalId = String(b.proposalId);
    type = String(b.type);
    iteration = b.iteration != null ? Number(b.iteration) : undefined;
    detail = b.detail != null ? String(b.detail) : undefined;
    runUrl = b.runUrl != null ? String(b.runUrl) : undefined;
    if (!proposalId || proposalId === "undefined" || !TYPES.has(type)) throw new Error("missing/invalid proposalId or type");
  } catch (e) {
    return NextResponse.json({ error: "bad body: " + (e as Error).message }, { status: 400 });
  }

  if (type === "needs_attention") {
    const cause = CAUSES.has(String(b.cause)) ? (String(b.cause) as NeedsAttentionReport["cause"]) : "other";
    const report: NeedsAttentionReport = {
      cause,
      summary: String(b.summary ?? detail ?? "Verification needs your attention").slice(0, 200),
      // Leave headroom for the JSON envelope inside the stored detail.
      report: String(b.report ?? "(no report)").slice(0, REPORT_MAX_LEN - 1000),
      runUrl,
      retryable: b.retryable !== false && cause !== "hash_mismatch",
    };
    await recordEvent(proposalId, NEEDS_ATTENTION_EVENT, {
      detail: JSON.stringify(report),
      maxDetailLen: REPORT_MAX_LEN,
      push: {
        title: cause === "hash_mismatch" ? `⚠️ Hash mismatch #${proposalId}` : `🛑 Verify needs you #${proposalId}`,
        body: report.summary,
        url: `${APP_URL}/proposals/${proposalId}/verification`,
        urgent: true,
      },
    });
    return NextResponse.json({ status: "recorded", type });
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
