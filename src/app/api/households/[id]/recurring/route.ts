import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const recs = await db.recurringExpense.findMany({
    where: { householdId: id, active: true },
    include: { paidBy: true },
    orderBy: { nextRunAt: "asc" },
  });
  const result = recs.map((r) => ({
    id: r.id,
    amount: r.amount,
    category: r.category,
    cadence: r.cadence,
    dayField: r.dayField,
    nextRunAt: r.nextRunAt,
    paidByName: r.paidBy.name,
  }));
  return NextResponse.json({ recurring: result });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { amount, category, cadence, dayField, paidById } = await req.json();
  if (!amount || !category || !cadence || !paidById)
    return NextResponse.json({ error: "Заполните все поля" }, { status: 400 });
  const now = new Date();
  let nextRunAt = new Date(now.getTime() + 24 * 3600 * 1000);
  if (cadence === "monthly") {
    nextRunAt = new Date(now.getFullYear(), now.getMonth() + 1, Math.min(dayField || 1, 31), 9, 0, 0);
  } else if (cadence === "weekly") {
    const diff = ((dayField || 0) - now.getDay() + 7) % 7 || 7;
    nextRunAt = new Date(now.getTime() + diff * 24 * 3600 * 1000);
    nextRunAt.setHours(9, 0, 0, 0);
  } else if (cadence === "yearly") {
    nextRunAt = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate(), 9, 0, 0);
  }
  const rec = await db.recurringExpense.create({
    data: {
      householdId: id,
      amount: parseInt(amount, 10),
      category: String(category).slice(0, 40),
      paidById,
      cadence,
      dayField: parseInt(dayField, 10) || 0,
      nextRunAt,
    },
  });
  return NextResponse.json({ ok: true, recurring: rec });
}
