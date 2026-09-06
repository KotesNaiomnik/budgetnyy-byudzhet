import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const planned = await db.scheduledExpense.findMany({
    where: { householdId: id, convertedAt: null },
    include: { paidBy: true },
    orderBy: { scheduledDate: "asc" },
  });
  const result = planned.map((p) => ({
    id: p.id,
    amount: p.amount,
    category: p.category,
    description: p.description,
    scheduledDate: p.scheduledDate,
    paidByName: p.paidBy.name,
    convertedAt: p.convertedAt,
  }));
  return NextResponse.json({ scheduled: result });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { amount, category, paidById, scheduledDate, participantIds } = await req.json();
  if (!amount || !category || !paidById || !scheduledDate)
    return NextResponse.json({ error: "Заполните все поля" }, { status: 400 });
  const d = new Date(scheduledDate);
  if (d.getTime() < Date.now())
    return NextResponse.json({ error: "Дата уже прошла" }, { status: 400 });
  const se = await db.scheduledExpense.create({
    data: {
      householdId: id,
      amount: parseInt(amount, 10),
      category: String(category).slice(0, 40),
      paidById,
      scheduledDate: d,
    },
  });
  return NextResponse.json({ ok: true, scheduled: se });
}
