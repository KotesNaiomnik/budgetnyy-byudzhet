import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const { id, memberId } = await params;
  await db.$transaction([
    db.expense.deleteMany({ where: { householdId: id, paidById: memberId } }),
    db.settlement.deleteMany({
      where: { householdId: id, OR: [{ fromId: memberId }, { toId: memberId }] },
    }),
    db.expenseParticipant.deleteMany({ where: { memberId } }),
    db.householdMember.deleteMany({ where: { householdId: id, memberId } }),
  ]);
  return NextResponse.json({ ok: true });
}
