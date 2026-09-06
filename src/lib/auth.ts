/**
 * Lightweight email/password authentication utilities.
 *
 * Uses Node's built-in `crypto` module — no external dependencies.
 *  - Passwords are hashed with scrypt (salt + hash, both hex-encoded).
 *  - Session tokens are HMAC-signed JSON web tokens (compact, self-contained).
 *  - Tokens are stored in an httpOnly cookie named "bb_session".
 */

import {
  randomBytes,
  scryptSync,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// Secret key
// ---------------------------------------------------------------------------

const SESSION_SECRET =
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  // Stable fallback derived from the database path so it persists across
  // dev-server restarts in the same environment. This is NOT secure for
  // production — set AUTH_SECRET in production.
  "bb-dev-secret-do-not-use-in-prod-7f3a9c2e1b8d4a6f";

const COOKIE_NAME = "bb_session";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

// ---------------------------------------------------------------------------
// Password hashing (scrypt)
// ---------------------------------------------------------------------------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = scryptSync(password, salt, 64).toString("hex");
  // Constant-time comparison to prevent timing attacks.
  return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(test, "hex"));
}

// ---------------------------------------------------------------------------
// Session token (HMAC-signed JSON)
// ---------------------------------------------------------------------------

interface SessionPayload {
  uid: string;
  email: string;
  iat: number;
  exp: number;
}

function b64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64url");
}

function b64urlDecode(input: string): Buffer {
  return Buffer.from(input, "base64url");
}

export function createSessionToken(userId: string, email: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    uid: userId,
    email,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };
  const headerB64 = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadB64 = b64url(JSON.stringify(payload));
  const data = `${headerB64}.${payloadB64}`;
  const sig = createHmac("sha256", SESSION_SECRET).update(data).digest();
  return `${data}.${sig.toString("base64url")}`;
}

export function verifySessionToken(token: string | null | undefined): SessionPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  const data = `${headerB64}.${payloadB64}`;

  const expectedSig = createHmac("sha256", SESSION_SECRET)
    .update(data)
    .digest();
  let givenSig: Buffer;
  try {
    givenSig = b64urlDecode(sigB64);
  } catch {
    return null;
  }
  if (expectedSig.length !== givenSig.length) return null;
  if (!timingSafeEqual(expectedSig, givenSig)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(b64urlDecode(payloadB64).toString("utf8"));
  } catch {
    return null;
  }
  if (typeof payload.exp !== "number") return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

export const SESSION_COOKIE = COOKIE_NAME;

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: TOKEN_TTL_SECONDS,
    secure: process.env.NODE_ENV === "production",
  };
}

// ---------------------------------------------------------------------------
// Request-level helpers
// ---------------------------------------------------------------------------

/** Read the current session payload from a NextRequest's cookies. */
export function getSessionFromRequest(req: NextRequest): SessionPayload | null {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

/** Resolve the current User record (or null) from a NextRequest's cookies. */
export async function getCurrentUser(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.uid },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  return user;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): boolean {
  return EMAIL_RE.test(email) && email.length <= 254;
}

export function validatePassword(password: string): boolean {
  return typeof password === "string" && password.length >= 6 && password.length <= 200;
}

export function validateName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= 80;
}
