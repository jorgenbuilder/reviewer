// Auth for the draft-editing surface (BUI-242).
//
// Two principals:
//  - The human: a long-lived httpOnly device cookie, set once per device by
//    visiting /unlock?key=<EDIT_SECRET>. The cookie value is an HMAC derived
//    from EDIT_SECRET (never the secret itself), so rotating the secret
//    invalidates every device at once.
//  - Agents: the existing CRON_SECRET bearer token, with an optional X-Author
//    header for attribution (recorded as "agent:<name>").
import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const EDIT_COOKIE = "edit_token";

function editSecret(): string | null {
  return process.env.EDIT_SECRET || null;
}

/** The device-cookie value derived from EDIT_SECRET. */
export function deriveEditToken(): string | null {
  const secret = editSecret();
  if (!secret) return null;
  return createHmac("sha256", secret).update("reviewer-edit-cookie-v1").digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** True iff `key` is the current EDIT_SECRET (used by /unlock). */
export function isValidUnlockKey(key: string): boolean {
  const secret = editSecret();
  return !!secret && safeEqual(key, secret);
}

export interface EditIdentity {
  author: string; // 'jorgen' | 'agent:<name>'
  via: "cookie" | "bearer";
}

/**
 * Resolve the caller of a draft API request, or null when unauthorized.
 * Bearer CRON_SECRET (agents) is checked first, then the device cookie.
 */
export function editIdentity(request: NextRequest): EditIdentity | null {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) {
    const name = (request.headers.get("x-author") || "agent").slice(0, 64);
    return { author: name.startsWith("agent:") ? name : `agent:${name}`, via: "bearer" };
  }
  const cookie = request.cookies.get(EDIT_COOKIE)?.value;
  const expected = deriveEditToken();
  if (cookie && expected && safeEqual(cookie, expected)) {
    return { author: "jorgen", via: "cookie" };
  }
  return null;
}
