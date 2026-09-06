import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { name } = await req.json();
  if (!name || !String(name).trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
  await db.household.update({ where: { id }, data: { name: String(name).trim().slice(0, 60) } });
  return NextResponse.json({ ok: true });
}
