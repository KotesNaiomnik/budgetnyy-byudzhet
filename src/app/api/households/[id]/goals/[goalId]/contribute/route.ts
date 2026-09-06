import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; goalId: string }> },
) {
  const { id, goalId } = await params;
  const { amount, memberId } = await req.json();
  if (!amount || amount <= 0 || !memberId)
    return NextResponse.json({ error: "Укажите сумму и участника" }, { status: 400 });
  await db.goalContribution.create({
    data: { goalId, memberId, amount: parseInt(amount, 10) },
  });
  return NextResponse.json({ ok: true });
}
