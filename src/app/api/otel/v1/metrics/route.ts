// OTLP/JSON metrics ingest for Claude Code telemetry (CLAUDE_CODE_ENABLE_TELEMETRY).
// Claude Code cloud sessions working on a review export here every OTEL_METRIC_EXPORT_INTERVAL
// ms; we extract token/cost counters and upsert per-session totals for realtime display on the
// proposal detail view. Auth: Bearer CRON_SECRET (via OTEL_EXPORTER_OTLP_HEADERS).
import { NextRequest, NextResponse } from "next/server";
import { parseClaudeCodeMetrics, type AttributedSessionCostDelta, type OtlpMetricsRequest } from "@/lib/otel";
import { getSessionClaims, upsertSessionCosts } from "@/lib/db";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: OtlpMetricsRequest;
  try {
    payload = (await request.json()) as OtlpMetricsRequest;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  try {
    const rows = parseClaudeCodeMetrics(payload);
    // Rows without a proposal.id resource attribute (the durable env doesn't bake one in) are
    // attributed via the session→proposal claim the session registered (POST /api/claim-session).
    // Unclaimed sessions are dropped — harmless, since counters are cumulative: once the session
    // claims, its next export carries the full running totals.
    const unattributed = rows.filter((r) => !r.proposalId);
    if (unattributed.length > 0) {
      const claims = await getSessionClaims([...new Set(unattributed.map((r) => r.sessionId))]);
      for (const r of unattributed) r.proposalId = claims.get(r.sessionId) ?? null;
    }
    const attributed = rows.filter((r): r is AttributedSessionCostDelta => !!r.proposalId);
    await upsertSessionCosts(attributed);
    // OTLP expects an ExportMetricsServiceResponse; empty object = full success.
    return NextResponse.json({ partialSuccess: {} });
  } catch (err) {
    console.error("[otel] ingest failed:", (err as Error).message);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
