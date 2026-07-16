// Draft read/write API (BUI-242). Auth: device edit-cookie (human) or
// CRON_SECRET bearer + optional X-Author header (agents) — see lib/edit-auth.
//
// GET  → { content, headVersion, updatedAt, author } (lazily creates the skeleton)
// PUT  { content, baseVersion } →
//   200 { outcome: "saved" | "merged", version, content? }   (merged returns the merged text)
//   409 { outcome: "conflict", headVersion, headContent }    (overlapping edits — resolve client-side)
import { NextRequest, NextResponse } from "next/server";
import { editIdentity } from "@/lib/edit-auth";
import { getOrCreateDraft, saveDraft } from "@/lib/drafts";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = editIdentity(request);
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: "bad proposal id" }, { status: 400 });

  try {
    const draft = await getOrCreateDraft(id);
    return NextResponse.json({
      proposalId: id,
      content: draft.content,
      headVersion: draft.headVersion,
      updatedAt: draft.updatedAt,
      author: identity.author,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = editIdentity(request);
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: "bad proposal id" }, { status: 400 });

  let body: { content?: string; baseVersion?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (typeof body.content !== "string" || typeof body.baseVersion !== "number") {
    return NextResponse.json({ error: "content (string) and baseVersion (number) required" }, { status: 400 });
  }
  if (body.content.length > 200_000) {
    return NextResponse.json({ error: "draft too large" }, { status: 413 });
  }

  try {
    const result = await saveDraft(id, {
      content: body.content,
      baseVersion: body.baseVersion,
      author: identity.author,
    });
    if (result.outcome === "conflict") {
      return NextResponse.json(result, { status: 409 });
    }
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
