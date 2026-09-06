import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: { name?: unknown; username?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const username =
    typeof body.username === "string" && body.username.trim()
      ? body.username.trim().slice(0, 64)
      : null;

  const household = await db.household.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!household) {
    return NextResponse.json({ error: "household not found" }, { status: 404 });
  }

  // Create member + link to household in a single transaction.
  const member = await db.$transaction(async (tx) => {
    const m = await tx.member.create({ data: { name, username } });
    await tx.householdMember.create({
      data: { householdId: id, memberId: m.id },
    });
    return m;
  });

  return NextResponse.json({
    ok: true,
    member: {
      id: member.id,
      name: member.name,
      username: member.username,
    },
  });
}
