import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const DEMO_CODE = "DEMO-FLAT";

export async function POST() {
  // Idempotent: reuse the demo household if it already exists.
  let household = await db.household.findUnique({
    where: { inviteCode: DEMO_CODE },
    include: { members: { include: { member: true } } },
  });

  if (!household) {
    household = await db.household.create({
      data: {
        name: "Квартира на Ленина",
        inviteCode: DEMO_CODE,
        currency: "₽",
        monthlyBudget: 60000,
      },
      include: { members: { include: { member: true } } },
    });
  }

  // Members (demo, no Telegram binding).
  const memberNames = ["Аня", "Боря", "Вика"];
  const existing = household.members;
  const members = [];

  for (const name of memberNames) {
    let m = existing.find((e) => e.member.name === name)?.member;
    if (!m) {
      m = await db.member.create({ data: { name } });
    }
    const alreadyIn = await db.householdMember.findUnique({
      where: {
        householdId_memberId: { householdId: household.id, memberId: m.id },
      },
    });
    if (!alreadyIn) {
      await db.householdMember.create({
        data: { householdId: household.id, memberId: m.id },
      });
    }
    members.push(m);
  }

  const [anya, borya, vika] = members;

  // Demo expenses spread across the current month. Only seed if none exist yet.
  const expenseCount = await db.expense.count({
    where: { householdId: household.id },
  });

  if (expenseCount === 0) {
    const now = new Date();
    const y = now.getFullYear();
    const mo = now.getMonth();
    const d = (day: number, hour = 12) =>
      new Date(y, mo, Math.min(day, 28), hour, 0, 0);

    const expenses = [
      { amount: 4350, category: "products", description: "Пятёрочка — еженедельный запас", paidBy: anya, date: d(2) },
      { amount: 5800, category: "utilities", description: "Коммуналка за месяц", paidBy: borya, date: d(3) },
      { amount: 1200, category: "transport", description: "Такси до ИКЕА", paidBy: vika, date: d(5) },
      { amount: 8900, category: "household", description: "Полки, посуда, средства", paidBy: anya, date: d(5) },
      { amount: 3200, category: "restaurants", description: "Пицца на всех", paidBy: borya, date: d(7) },
      { amount: 2150, category: "products", description: "Молочка и фрукты", paidBy: vika, date: d(9) },
      { amount: 4600, category: "products", description: "Оптовый закуп в Метро", paidBy: anya, date: d(12) },
      { amount: 1500, category: "leisure", description: "Кино билеты", paidBy: borya, date: d(14) },
      { amount: 2400, category: "transport", description: "Бензин", paidBy: borya, date: d(16) },
      { amount: 3850, category: "products", description: "Доставка продуктов", paidBy: vika, date: d(18) },
      { amount: 6200, category: "utilities", description: "Интернет + электричество", paidBy: anya, date: d(20) },
      { amount: 2700, category: "restaurants", description: "Завтрак в кафе", paidBy: vika, date: d(22) },
      { amount: 1900, category: "household", description: "Бытовая химия", paidBy: borya, date: d(24) },
      { amount: 5100, category: "products", description: "Овощи, мясо, хлеб", paidBy: anya, date: d(26) },
    ];

    for (const e of expenses) {
      await db.expense.create({
        data: {
          householdId: household.id,
          amount: e.amount,
          category: e.category,
          description: e.description,
          paidById: e.paidBy.id,
          date: e.date,
        },
      });
    }

    // One settlement: Вика вернула часть долга Ане.
    await db.settlement.create({
      data: {
        householdId: household.id,
        fromId: vika.id,
        toId: anya.id,
        amount: 2000,
        note: "Часть за продукты",
        date: d(21),
      },
    });
  }

  return NextResponse.json({ ok: true, householdId: household.id });
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "POST to seed demo data" });
}
