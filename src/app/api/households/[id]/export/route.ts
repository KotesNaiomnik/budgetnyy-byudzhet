import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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
  const rows: string[] = [];
  rows.push(`# Отчёт (код группы)`);
  rows.push(`# Сгенерирован: ${formatDate(new Date())}`);
  rows.push("");
  rows.push("Дата,Категория,Описание,Сумма,Плательщик,Участники");
  for (const e of expenses) {
    const parts = (e.participants.map((p) => p.member.name).join("; ")) || "—";
    rows.push([
      formatDate(e.date).replace(/,/g, " "),
      (e.category || "").replace(/,/g, " "),
      (e.description ?? "").replace(/,/g, " "),
      String(e.amount),
      e.paidBy.name.replace(/,/g, " "),
      parts.replace(/,/g, " "),
    ].join(","));
  }
  rows.push("");
  rows.push("Дата,От кого,Кому,Сумма,Описание");
  for (const st of settlements) {
    rows.push([
      formatDate(st.date).replace(/,/g, " "),
      st.from.name.replace(/,/g, " "),
      st.to.name.replace(/,/g, " "),
      String(st.amount),
      (st.note ?? "").replace(/,/g, " "),
    ].join(","));
  }
  const csv = "\uFEFF" + rows.join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="report.csv"`,
    },
  });
}
