import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const goals = await db.goal.findMany({
    where: { householdId: id },
    include: { contributions: true },
    orderBy: { createdAt: "desc" },
  });
  const result = goals.map((g) => {
    const saved = g.contributions.reduce((s, c) => s + c.amount, 0);
    return {
      id: g.id,
      title: g.title,
      targetAmount: g.targetAmount,
      dueDate: g.dueDate,
      saved,
      pct: g.targetAmount > 0 ? Math.min(100, Math.round((saved / g.targetAmount) * 100)) : 0,
    };
  });
  return NextResponse.json({ goals: result });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { title, targetAmount } = await req.json();
  if (!title || !targetAmount || targetAmount <= 0)
    return NextResponse.json({ error: "Укажите название и сумму" }, { status: 400 });
  const goal = await db.goal.create({
    data: { householdId: id, title: String(title).slice(0, 60), targetAmount: parseInt(targetAmount, 10) },
  });
  return NextResponse.json({ ok: true, goal });
}
