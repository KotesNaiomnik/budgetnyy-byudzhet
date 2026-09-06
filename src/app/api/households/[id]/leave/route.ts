import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { memberId } = await req.json();
  if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });
  await db.$transaction([
    db.expense.deleteMany({ where: { householdId: id, paidById: memberId } }),
    db.settlement.deleteMany({ where: { householdId: id, OR: [{ fromId: memberId }, { toId: memberId }] } }),
    db.expenseParticipant.deleteMany({ where: { memberId } }),
    db.householdMember.deleteMany({ where: { householdId: id, memberId } }),
  ]);
  return NextResponse.json({ ok: true });
}
