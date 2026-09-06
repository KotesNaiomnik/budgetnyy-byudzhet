import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function randomInviteCode(len = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

async function uniqueInviteCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = randomInviteCode();
    const exists = await db.household.findUnique({
      where: { inviteCode: code },
      select: { id: true },
    });
    if (!exists) return code;
  }
  // Fallback with longer code.
  return randomInviteCode(10);
}

export async function GET(req: NextRequest) {
  // Auto-seed demo data if the database is empty (first run on a new machine).
  const count = await db.household.count();
  if (count === 0) {
    await seedDemo();
  }

  const user = await getCurrentUser(req);

  // Show: demo household (public) + user's own households + households where
  // the user is a member (via Member.userId, set after /bind with Telegram).
  // When logged out, only public (ownerId = null) households are shown.
  const where = user
    ? {
        OR: [
          { ownerId: null },
          { ownerId: user.id },
          { members: { some: { member: { userId: user.id } } } },
        ],
      }
    : { ownerId: null };

  const households = await db.household.findMany({
    where: { ...where, members: { some: {} } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      inviteCode: true,
      currency: true,
      monthlyBudget: true,
      ownerId: true,
      _count: { select: { members: true } },
    },
  });

  return NextResponse.json({
    user,
    households: households.map((h) => ({
      id: h.id,
      name: h.name,
      inviteCode: h.inviteCode,
      currency: h.currency,
      monthlyBudget: h.monthlyBudget,
      ownerId: h.ownerId,
      isOwned: user ? h.ownerId === user.id : false,
      memberCount: h._count.members,
    })),
  });
}

export async function POST(req: NextRequest) {
  let body: { name?: unknown; monthlyBudget?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const monthlyBudget =
    typeof body.monthlyBudget === "number" &&
    Number.isFinite(body.monthlyBudget) &&
    body.monthlyBudget >= 0
      ? Math.round(body.monthlyBudget)
      : null;

  const inviteCode = await uniqueInviteCode();
  const user = await getCurrentUser(req);

  // Reuse the user's existing Member if one exists (after /bind, the user has
  // a single Member record shared between web and Telegram). This prevents
  // duplicate participants when the same person acts from both sides.
  let member;
  if (user) {
    member = await db.member.findFirst({
      where: { userId: user.id },
    });
    if (!member) {
      member = await db.member.create({
        data: { name: user.name, userId: user.id },
      });
    }
  } else {
    member = await db.member.create({ data: { name: "Веб-участник" } });
  }
  const household = await db.household.create({
    data: {
      name,
      inviteCode,
      monthlyBudget,
      currency: "₽",
      ownerId: user?.id ?? null,
      members: { create: { memberId: member.id } },
    },
    select: {
      id: true,
      name: true,
      inviteCode: true,
      currency: true,
      monthlyBudget: true,
      createdAt: true,
      ownerId: true,
    },
  });

  return NextResponse.json({ household });
}

// --- Auto-seed demo data for first run ---
async function seedDemo() {
  const DEMO_CODE = "DEMO-FLAT";
  const household = await db.household.create({
    data: {
      name: "Квартира на Ленина",
      inviteCode: DEMO_CODE,
      currency: "₽",
      monthlyBudget: 60000,
      budgetAmount: 60000,
      budgetStart: new Date(),
      budgetEnd: new Date(Date.now() + 30 * 86400000),
    },
  });

  const memberNames = ["Аня", "Боря", "Вика"];
  const members = [];
  for (const name of memberNames) {
    const m = await db.member.create({ data: { name } });
    await db.householdMember.create({
      data: { householdId: household.id, memberId: m.id },
    });
    members.push(m);
  }

  const now = new Date();
  const y = now.getFullYear();
  const mo = now.getMonth();
  const d = (day: number, hour = 12) => new Date(y, mo, Math.min(day, 28), hour, 0, 0);

  const expenses = [
    { amount: 4350, category: "products", description: "Пятёрочка — еженедельный запас", paidBy: members[0], date: d(2) },
    { amount: 5800, category: "utilities", description: "Коммуналка за месяц", paidBy: members[1], date: d(3) },
    { amount: 1200, category: "transport", description: "Такси до ИКЕА", paidBy: members[2], date: d(5) },
    { amount: 8900, category: "household", description: "Полки, посуда, средства", paidBy: members[0], date: d(5) },
    { amount: 3200, category: "restaurants", description: "Пицца на всех", paidBy: members[1], date: d(7) },
    { amount: 2150, category: "products", description: "Молочка и фрукты", paidBy: members[2], date: d(9) },
    { amount: 4600, category: "products", description: "Оптовый закуп в Метро", paidBy: members[0], date: d(12) },
    { amount: 1500, category: "leisure", description: "Кино билеты", paidBy: members[1], date: d(14) },
    { amount: 2400, category: "transport", description: "Бензин", paidBy: members[1], date: d(16) },
    { amount: 3850, category: "products", description: "Доставка продуктов", paidBy: members[2], date: d(18) },
    { amount: 6200, category: "utilities", description: "Интернет + электричество", paidBy: members[0], date: d(20) },
    { amount: 2700, category: "restaurants", description: "Завтрак в кафе", paidBy: members[2], date: d(22) },
    { amount: 1900, category: "household", description: "Бытовая химия", paidBy: members[1], date: d(24) },
    { amount: 5100, category: "products", description: "Овощи, мясо, хлеб", paidBy: members[0], date: d(26) },
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

  await db.settlement.create({
    data: {
      householdId: household.id,
      fromId: members[2].id,
      toId: members[0].id,
      amount: 2000,
      note: "Часть за продукты",
      date: d(21),
    },
  });
}
