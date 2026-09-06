import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: {
    fromId?: unknown;
    toId?: unknown;
    amount?: unknown;
    note?: unknown;
  } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const fromId = typeof body.fromId === "string" ? body.fromId.trim() : "";
  const toId = typeof body.toId === "string" ? body.toId.trim() : "";
  if (!fromId || !toId || fromId === toId) {
    return NextResponse.json(
      { error: "fromId and toId must be different members" },
      { status: 400 },
    );
  }

  const amount =
    typeof body.amount === "number" && Number.isFinite(body.amount)
      ? Math.round(body.amount)
      : NaN;
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "amount must be a positive number" },
      { status: 400 },
    );
  }

  // Verify both are household members.
  const [fromLink, toLink] = await Promise.all([
    db.householdMember.findUnique({
      where: {
        householdId_memberId: { householdId: id, memberId: fromId },
      },
      select: { id: true },
    }),
    db.householdMember.findUnique({
      where: {
        householdId_memberId: { householdId: id, memberId: toId },
      },
      select: { id: true },
    }),
  ]);
  if (!fromLink || !toLink) {
    return NextResponse.json(
      { error: "from/to must be household members" },
      { status: 400 },
    );
  }

  const note =
    typeof body.note === "string" && body.note.trim()
      ? body.note.trim().slice(0, 240)
      : null;

  const settlement = await db.settlement.create({
    data: { householdId: id, fromId, toId, amount, note },
  });

  return NextResponse.json({ ok: true, settlement });
}
