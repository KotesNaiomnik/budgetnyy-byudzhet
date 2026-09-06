import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const household = await db.household.findUnique({ where: { id } });
  if (!household) return NextResponse.json({ error: "not found" }, { status: 404 });

  const expenses = await db.expense.findMany({
    where: { householdId: id },
    include: { paidBy: true, participants: { include: { member: true } } },
    orderBy: { date: "asc" },
  });
  const settlements = await db.settlement.findMany({
    where: { householdId: id },
    include: { from: true, to: true },
    orderBy: { date: "asc" },
  });

  const rows = expenses
    .map((e) => {
      const parts = e.participants.map((p) => p.member.name).join(", ") || "—";
      return `<tr><td>${formatDate(e.date)}</td><td>${e.category}</td><td>${e.description ?? ""}</td><td style="text-align:right">${e.amount}</td><td>${e.paidBy.name}</td><td>${parts}</td></tr>`;
    })
    .join("");
  const srows = settlements
    .map((s) => `<tr><td>${formatDate(s.date)}</td><td>${s.from.name}</td><td>${s.to.name}</td><td style="text-align:right">${s.amount}</td><td>${s.note ?? ""}</td></tr>`)
    .join("");
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Отчёт — ${household.name}</title>
<style>body{font-family:Arial,sans-serif;margin:32px;color:#1a1a1a}h1{font-size:20px}h2{font-size:15px;margin-top:24px}table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}th,td{border:1px solid #ddd;padding:4px 8px;text-align:left}th{background:#f5f5f5}.total{font-weight:bold;margin-top:12px;font-size:14px}</style></head><body>
<h1>Отчёт по группе «${household.name}»</h1>
<p>Код: ${household.inviteCode} · Сгенерирован: ${formatDate(new Date())}</p>
<h2>Расходы (${expenses.length})</h2>
<table><thead><tr><th>Дата</th><th>Категория</th><th>Описание</th><th>Сумма</th><th>Плательщик</th><th>Участники</th></tr></thead><tbody>${rows}</tbody></table>
<p class="total">Всего: ${total} ₽</p>
${settlements.length > 0 ? `<h2>Возвраты (${settlements.length})</h2><table><thead><tr><th>Дата</th><th>От</th><th>Кому</th><th>Сумма</th><th>Описание</th></tr></thead><tbody>${srows}</tbody></table>` : ""}
<script>window.onload=function(){window.print()}</script>
</body></html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
