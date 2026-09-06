import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; recId: string }> },
) {
  const { recId } = await params;
  await db.recurringExpense.update({ where: { id: recId }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
