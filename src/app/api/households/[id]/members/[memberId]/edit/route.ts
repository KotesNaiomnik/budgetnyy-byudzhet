import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const { id, memberId } = await params;
  const { name, username } = await req.json();
  if (!name || !String(name).trim())
    return NextResponse.json({ error: "name required" }, { status: 400 });
  await db.member.update({
    where: { id: memberId },
    data: {
      name: String(name).trim().slice(0, 60),
      username: username ? String(username).trim().slice(0, 60) : null,
    },
  });
  return NextResponse.json({ ok: true });
}
