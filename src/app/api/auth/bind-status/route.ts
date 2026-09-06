import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** GET /api/auth/bind-status — is the current web user bound to a Telegram account? */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ bound: false });
  }

  // A user is "bound" if any Member row has userId = user.id AND tgUserId is set
  // (meaning the Telegram identity was linked via /bind).
  const member = await db.member.findFirst({
    where: { userId: user.id, tgUserId: { not: null } },
    select: { id: true, name: true, username: true, tgUserId: true },
  });

  return NextResponse.json({
    bound: !!member,
    tgUsername: member?.username ?? null,
    name: member?.name ?? null,
  });
}
