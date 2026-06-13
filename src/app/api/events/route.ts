// Per-proposal (or recent) activity timeline for the detail page.
// Events are non-sensitive lifecycle timestamps, so this is a public read.
//   GET /api/events?proposalId=142265        → that proposal's events, newest first
//   GET /api/events?limit=100                → recent events across all proposals
import { NextRequest, NextResponse } from "next/server";
import { getProposalEvents } from "@/lib/db";

export async function GET(request: NextRequest) {
  const proposalId = request.nextUrl.searchParams.get("proposalId") || undefined;
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Math.min(Math.max(Number(limitParam) || 0, 1), 500) : undefined;
  try {
    const events = await getProposalEvents({ proposalId, limit });
    return NextResponse.json({ events });
  } catch (error) {
    console.error("Failed to fetch events:", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}
