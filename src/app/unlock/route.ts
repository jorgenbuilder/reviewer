// Device unlock for draft editing (BUI-242): visit /unlock?key=<EDIT_SECRET>
// once per device to set the long-lived httpOnly edit cookie, then get
// redirected home. Rotating EDIT_SECRET invalidates every device.
import { NextRequest, NextResponse } from "next/server";
import { EDIT_COOKIE, deriveEditToken, isValidUnlockKey } from "@/lib/edit-auth";

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key") || "";
  const token = deriveEditToken();
  if (!token || !isValidUnlockKey(key)) {
    return new NextResponse("invalid or missing key", { status: 401 });
  }
  const res = NextResponse.redirect(new URL("/", request.url));
  res.cookies.set(EDIT_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
  return res;
}
