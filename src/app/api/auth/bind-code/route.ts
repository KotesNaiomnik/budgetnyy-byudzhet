import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars

function generateCode(len = 6): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) {
    out += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  }
  return out;
}

async function uniqueCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateCode();
    const exists = await db.bindCode.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!exists) return code;
  }
  return generateCode(8);
}

/** POST /api/auth/bind-code — create a fresh one-time bind code (requires auth). */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  // Invalidate (mark expired) all unused previous codes for this user so only
  // the newest one is valid at any time.
  await db.bindCode.deleteMany({
    where: { userId: user.id, usedAt: null },
  });

  const code = await uniqueCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CODE_TTL_MS);

  await db.bindCode.create({
    data: { code, userId: user.id, expiresAt },
  });

  return NextResponse.json({ code, expiresAt: expiresAt.toISOString() });
}
