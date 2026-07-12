// Full parsed-proposal payload for the detail page. Fetched client-side via
// TanStack Query (["proposal", id]) so switching between proposals hits the
// cache instead of re-running the on-chain + GitHub + DB assembly on every
// navigation. Public read (same posture as the rest of the proposal detail data).
import { NextRequest, NextResponse } from "next/server";
import { buildParsedProposal } from "@/lib/proposal-view";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing proposal ID" }, { status: 400 });
  try {
    const proposal = await buildParsedProposal(id);
    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }
    return NextResponse.json(proposal, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error(`[proposal] #${id} failed:`, (err as Error).message);
    return NextResponse.json({ error: "Failed to load proposal" }, { status: 500 });
  }
}
