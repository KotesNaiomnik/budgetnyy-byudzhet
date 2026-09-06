import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; schedId: string }> },
) {
  const { schedId } = await params;
  await db.scheduledExpense.delete({ where: { id: schedId } });
  return NextResponse.json({ ok: true });
}
