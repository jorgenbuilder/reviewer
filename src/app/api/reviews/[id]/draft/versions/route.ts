// Draft version history (BUI-242).
//   GET            → { versions: [{version, author, merged, parentVersion, createdAt}] }
//   GET ?version=N → { version, content } (single snapshot, for diff rendering)
import { NextRequest, NextResponse } from "next/server";
import { editIdentity } from "@/lib/edit-auth";
import { listDraftVersions, getDraftVersionContent } from "@/lib/drafts";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = editIdentity(request);
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: "bad proposal id" }, { status: 400 });

  const versionParam = request.nextUrl.searchParams.get("version");
  try {
    if (versionParam) {
      const version = parseInt(versionParam, 10);
      const content = await getDraftVersionContent(id, version);
      if (content == null) return NextResponse.json({ error: "version not found" }, { status: 404 });
      return NextResponse.json({ version, content });
    }
    const versions = await listDraftVersions(id);
    return NextResponse.json({ versions });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
