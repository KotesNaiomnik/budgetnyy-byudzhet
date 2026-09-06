import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  byCategory,
  byMember,
  computeBalances,
  type ExpenseRow,
  type MemberRow,
  type SettlementRow,
} from "@/lib/finance";
import { isSameMonth } from "@/lib/format";
import { chartCategory } from "@/lib/categories";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const household = await db.household.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      inviteCode: true,
      currency: true,
      monthlyBudget: true,
      budgetAmount: true,
      budgetStart: true,
      budgetEnd: true,
    },
  });

  if (!household) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const memberLinks = await db.householdMember.findMany({
    where: { householdId: id },
    include: { member: true },
    orderBy: { joinedAt: "asc" },
  });

  const members = memberLinks.map((m) => ({
    id: m.member.id,
    name: m.member.name,
    username: m.member.username,
  }));

  const memberNameById = new Map(members.map((m) => [m.id, m.name]));

  const expenseRows = await db.expense.findMany({
    where: { householdId: id },
    orderBy: { date: "desc" },
    take: 60,
    include: { participants: { select: { memberId: true } } },
  });

  const expenses = expenseRows.map((e) => ({
    id: e.id,
    amount: e.amount,
    category: e.category,
    description: e.description,
    paidById: e.paidById,
    paidByName: memberNameById.get(e.paidById) ?? "—",
    date: e.date,
    participantIds: e.participants.map((p) => p.memberId),
    participantNames: e.participants.map(
      (p) => memberNameById.get(p.memberId) ?? "?",
    ),
  }));

  const settlementRows = await db.settlement.findMany({
    where: { householdId: id },
    orderBy: { date: "desc" },
  });

  const settlements = settlementRows.map((s) => ({
    id: s.id,
    fromId: s.fromId,
    fromName: memberNameById.get(s.fromId) ?? "—",
    toId: s.toId,
    toName: memberNameById.get(s.toId) ?? "—",
    amount: s.amount,
    note: s.note,
    date: s.date,
  }));

  const memberRows: MemberRow[] = members.map((m) => ({
    id: m.id,
    name: m.name,
    username: m.username,
  }));
  const expenseInputs: ExpenseRow[] = expenseRows.map((e) => ({
    id: e.id,
    amount: e.amount,
    category: e.category,
    description: e.description,
    paidById: e.paidById,
    date: e.date,
    participantIds: e.participants.map((p) => p.memberId),
  }));
  const settlementInputs: SettlementRow[] = settlementRows.map((s) => ({
    fromId: s.fromId,
    toId: s.toId,
    amount: s.amount,
  }));

  const balances = computeBalances(memberRows, expenseInputs, settlementInputs);
  const categorySlices = byCategory(expenseInputs);
  const memberSlices = byMember(expenseInputs, memberRows);

  // Merged chart categories (synonym-grouped).
  const chartCatMap = new Map<string, number>();
  for (const e of expenseInputs) {
    const cc = chartCategory(e.category);
    chartCatMap.set(cc, (chartCatMap.get(cc) ?? 0) + e.amount);
  }
  const byChartCategory = [...chartCatMap.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  const totalSpent = balances.totalSpent;
  const spentThisMonth = expenseInputs
    .filter((e) => isSameMonth(e.date))
    .reduce((s, e) => s + e.amount, 0);
  const expenseCount = expenseInputs.length;
  const budgetTotal = household.budgetAmount ?? household.monthlyBudget;
  const budgetRemaining = budgetTotal !== null ? budgetTotal - spentThisMonth : null;
  const budgetUsedPct =
    budgetTotal !== null && budgetTotal > 0
      ? Math.min(100, Math.round((spentThisMonth / budgetTotal) * 100))
      : budgetTotal !== null
        ? spentThisMonth > 0
          ? 100
          : 0
        : null;

  return NextResponse.json({
    household,
    members,
    expenses,
    settlements,
    balances,
    byCategory: categorySlices,
    byMember: memberSlices,
    byChartCategory,
    stats: {
      totalSpent,
      spentThisMonth,
      expenseCount,
      budgetTotal,
      budgetRemaining,
      budgetUsedPct,
      memberCount: members.length,
    },
  });
}
