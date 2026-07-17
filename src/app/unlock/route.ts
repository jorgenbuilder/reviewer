// Device unlock for draft editing (BUI-242). Two ways in:
//  - GET /unlock?key=<EDIT_SECRET> — desktop fast path (paste the full URL).
//  - GET /unlock (no key) — renders a paste-the-key form that POSTs back here.
//    This is the only path available inside the installed iOS PWA, which has
//    no URL bar and a cookie jar partitioned from Safari's (BUI-242 follow-up).
// Success sets the long-lived httpOnly edit cookie and redirects to `next`
// (same-origin path only) or /. Rotating EDIT_SECRET invalidates every device.
import { NextRequest, NextResponse } from "next/server";
import { EDIT_COOKIE, deriveEditToken, isValidUnlockKey } from "@/lib/edit-auth";

function safeNext(raw: string | null): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
}

function unlockGranted(request: NextRequest, token: string, next: string): NextResponse {
  const res = NextResponse.redirect(new URL(next, request.url), 303);
  res.cookies.set(EDIT_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
  return res;
}

function formPage(next: string, invalid: boolean): NextResponse {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Unlock editing · Reviewer</title>
<style>
  body { font-family: ui-monospace, monospace; font-size: 13px; display: grid;
         place-items: center; min-height: 100dvh; margin: 0; padding: 1rem; }
  form { display: grid; gap: .75rem; width: min(20rem, 100%); }
  input, button { font: inherit; padding: .5rem .6rem; border: 1px solid
                  color-mix(in srgb, currentColor 35%, transparent);
                  border-radius: 0; background: transparent; color: inherit; }
  button { font-weight: 700; text-transform: uppercase; cursor: pointer; }
  .err { color: #b91c1c; } @media (prefers-color-scheme: dark) { .err { color: #f87171; } }
</style>
</head>
<body>
<form method="post" action="/unlock">
  <strong>Unlock editing on this device</strong>
  ${invalid ? '<span class="err">Invalid key.</span>' : ""}
  <input type="password" name="key" placeholder="EDIT_SECRET" autofocus
         autocomplete="off" autocapitalize="off" spellcheck="false">
  <input type="hidden" name="next" value="${next.replace(/"/g, "&quot;")}">
  <button type="submit">Unlock</button>
</form>
</body>
</html>`;
  return new NextResponse(html, {
    status: invalid ? 401 : 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const token = deriveEditToken();
  if (key !== null && token && isValidUnlockKey(key)) {
    return unlockGranted(request, token, next);
  }
  return formPage(next, key !== null);
}

export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const key = typeof form?.get("key") === "string" ? (form.get("key") as string) : "";
  const next = safeNext(typeof form?.get("next") === "string" ? (form.get("next") as string) : null);
  const token = deriveEditToken();
  if (token && isValidUnlockKey(key)) {
    return unlockGranted(request, token, next);
  }
  return formPage(next, true);
}
