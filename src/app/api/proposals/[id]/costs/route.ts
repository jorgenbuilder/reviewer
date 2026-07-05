// Realtime cost breakdown for a proposal review: AI commentary + Claude Code cloud sessions.
// Polled by the ReviewCosts widget (TanStack Query refetchInterval). Public read (same posture
// as the rest of the proposal detail data).
import { NextRequest, NextResponse } from "next/server";
import { getReviewCosts } from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing proposal ID" }, { status: 400 });
  try {
    const costs = await getReviewCosts(id);
    return NextResponse.json(costs, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error(`[costs] #${id} failed:`, (err as Error).message);
    return NextResponse.json({ error: "Failed to load costs" }, { status: 500 });
  }
}
