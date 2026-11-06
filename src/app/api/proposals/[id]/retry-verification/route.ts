// Operator "I've fixed it" button on /proposals/<id>/verification: re-dispatches
// gh-verifier's verify.yml for this proposal. Auth: device edit-cookie or CRON_SECRET bearer.
import { NextRequest, NextResponse } from "next/server";
import { editIdentity } from "@/lib/edit-auth";
import { recordEvent } from "@/lib/events";
import { dispatchVerify, RETRY_REQUESTED_EVENT } from "@/lib/verification-report";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = editIdentity(request);
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: "bad proposal id" }, { status: 400 });

  const result = await dispatchVerify(id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
  await recordEvent(id, RETRY_REQUESTED_EVENT, { detail: `by ${identity.author}` });
  return NextResponse.json({ ok: true });
}
