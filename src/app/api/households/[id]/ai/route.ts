import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  generateForecast,
  generateOptimization,
  generateReminders,
  answerBudgetQuestion,
} from "@/lib/ai";
import { CATEGORIES } from "@/lib/categories";
import {
  computeBalances,
  type ExpenseRow,
  type MemberRow,
  type SettlementRow,
} from "@/lib/finance";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Latest insight per type.
  const types = ["optimization", "reminders", "forecast"];
  const latest = await Promise.all(
    types.map((type) =>
      db.aiInsight.findFirst({
        where: { householdId: id, type },
        orderBy: { createdAt: "desc" },
        select: { type: true, content: true, createdAt: true },
      }),
    ),
  );

  const insights = latest.filter((i): i is NonNullable<typeof i> => Boolean(i));
  return NextResponse.json({ insights });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: { type?: unknown; question?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const typeRaw = typeof body.type === "string" ? body.type : "";

  // AI Q&A: free-form question.
  if (typeRaw === "question") {
    const question =
      typeof body.question === "string" ? body.question.trim() : "";
    if (!question) {
      return NextResponse.json(
        { error: "question is required" },
        { status: 400 },
      );
    }
    if (question.length > 1000) {
      return NextResponse.json(
        { error: "question is too long (max 1000 chars)" },
        { status: 400 },
      );
    }

    try {
      const ctx = await buildContext(id);
      if (!ctx) {
        return NextResponse.json(
          { error: "household not found" },
          { status: 404 },
        );
      }
      const content = await answerBudgetQuestion(question, ctx);
      return NextResponse.json({
        ok: true,
        type: "question",
        content,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      console.error("[ai route] question failed:", err);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const type =
    typeof body.type === "string" &&
    ["optimization", "reminders", "forecast"].includes(body.type)
      ? (body.type as "optimization" | "reminders" | "forecast")
      : null;
  if (!type) {
    return NextResponse.json(
      { error: "type must be optimization|reminders|forecast|question" },
      { status: 400 },
    );
  }

  try {
    const ctx = await buildContext(id);
    if (!ctx) {
      return NextResponse.json(
        { error: "household not found" },
        { status: 404 },
      );
    }

    const content =
      type === "optimization"
        ? await generateOptimization(ctx)
        : type === "reminders"
          ? await generateReminders(ctx)
          : await generateForecast(ctx);

    const created = await db.aiInsight.create({
      data: { householdId: id, type, content },
      select: { type: true, content: true, createdAt: true },
    });

    return NextResponse.json({ ok: true, ...created });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[ai route] failed:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function buildContext(id: string) {
  const household = await db.household.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      currency: true,
      monthlyBudget: true,
    },
  });
  if (!household) return null;

  const memberLinks = await db.householdMember.findMany({
    where: { householdId: id },
    include: { member: true },
    orderBy: { joinedAt: "asc" },
  });

  const members: MemberRow[] = memberLinks.map((m) => ({
    id: m.member.id,
    name: m.member.name,
    username: m.member.username,
  }));

  const expenseRows = await db.expense.findMany({
    where: { householdId: id },
    orderBy: { date: "desc" },
    include: { participants: { select: { memberId: true } } },
  });
  const expenses: ExpenseRow[] = expenseRows.map((e) => ({
    id: e.id,
    amount: e.amount,
    category: e.category,
    description: e.description,
    paidById: e.paidById,
    date: e.date,
    participantIds: e.participants.map((p) => p.memberId),
  }));

  const settlementRows = await db.settlement.findMany({
    where: { householdId: id },
  });
  const settlements: SettlementRow[] = settlementRows.map((s) => ({
    fromId: s.fromId,
    toId: s.toId,
    amount: s.amount,
  }));

  const balances = computeBalances(members, expenses, settlements);
  const categoryLabels: Record<string, string> = Object.fromEntries(
    Object.entries(CATEGORIES).map(([k, v]) => [k, v.label]),
  );

  return {
    name: household.name,
    currency: household.currency,
    monthlyBudget: household.monthlyBudget,
    members,
    expenses,
    balances,
    categoryLabels,
  };
}
