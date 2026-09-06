import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface BudgetBody {
  monthlyBudget?: unknown;
  amount?: unknown;
  periodDays?: unknown;
  clear?: unknown;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: BudgetBody = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const household = await db.household.findUnique({
    where: { id },
    select: { id: true, budgetAmount: true, budgetStart: true, budgetEnd: true },
  });
  if (!household) {
    return NextResponse.json({ error: "household not found" }, { status: 404 });
  }

  // ----- Period-based budget (amount + N days) -----
  if (typeof body.amount === "number" && Number.isFinite(body.amount) && body.amount >= 0) {
    const amount = Math.round(body.amount);
    const periodDays =
      typeof body.periodDays === "number" &&
      Number.isFinite(body.periodDays) &&
      body.periodDays >= 1 &&
      body.periodDays <= 365 * 5
        ? Math.round(body.periodDays)
        : 30;

    const start = new Date();
    const end = new Date(start.getTime() + periodDays * 24 * 3600 * 1000);

    // Archive the current period budget before overwriting.
    if (
      household.budgetAmount !== null &&
      household.budgetStart !== null &&
      household.budgetEnd !== null
    ) {
      await db.budgetPeriod.create({
        data: {
          householdId: id,
          amount: household.budgetAmount,
          start: household.budgetStart,
          end: household.budgetEnd,
        },
      });
      // Trim history to last 3.
      const all = await db.budgetPeriod.findMany({
        where: { householdId: id },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (all.length > 3) {
        const toDelete = all.slice(3).map((p) => p.id);
        await db.budgetPeriod.deleteMany({ where: { id: { in: toDelete } } });
      }
    }

    const monthlyBudget = periodDays >= 28 && periodDays <= 31 ? amount : null;
    const updated = await db.household.update({
      where: { id },
      data: {
        budgetAmount: amount,
        budgetStart: start,
        budgetEnd: end,
        monthlyBudget,
      },
      select: { id: true, budgetAmount: true, budgetStart: true, budgetEnd: true },
    });
    return NextResponse.json({ ok: true, household: updated });
  }

  // ----- Clear period budget -----
  if (body.clear === true || body.clear === "true") {
    const updated = await db.household.update({
      where: { id },
      data: {
        budgetAmount: null,
        budgetStart: null,
        budgetEnd: null,
      },
      select: { id: true, budgetAmount: true, budgetStart: true, budgetEnd: true },
    });
    return NextResponse.json({ ok: true, household: updated });
  }

  // ----- Legacy: monthly budget only -----
  const raw = body.monthlyBudget;
  let monthlyBudget: number | null = null;
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
    monthlyBudget = Math.round(raw);
  } else if (raw === null) {
    monthlyBudget = null;
  } else {
    return NextResponse.json(
      { error: "monthlyBudget must be a non-negative number or null" },
      { status: 400 },
    );
  }

  const updated = await db.household.update({
    where: { id },
    data: { monthlyBudget },
    select: { id: true, monthlyBudget: true },
  });

  return NextResponse.json({ ok: true, household: updated });
}
