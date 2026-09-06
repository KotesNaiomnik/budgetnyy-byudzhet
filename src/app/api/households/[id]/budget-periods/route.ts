import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formatMoney, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const periods = await db.budgetPeriod.findMany({
    where: { householdId: id },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  const result = await Promise.all(
    periods.map(async (p) => {
      const agg = await db.expense.aggregate({
        where: { householdId: id, date: { gte: p.start, lte: p.end } },
        _sum: { amount: true },
      });
      const spent = agg._sum.amount ?? 0;
      const days = Math.max(1, Math.round((p.end.getTime() - p.start.getTime()) / 86400000));
      return {
        id: p.id,
        amount: p.amount,
        start: p.start,
        end: p.end,
        spent,
        remain: p.amount - spent,
        days,
      };
    }),
  );
  return NextResponse.json({ periods: result });
}
