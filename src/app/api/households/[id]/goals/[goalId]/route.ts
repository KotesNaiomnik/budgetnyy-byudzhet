import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; goalId: string }>;
  },
) {
  const { id, goalId } = await params;
  let body: { amount?: unknown; memberId?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
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

  const memberId =
    typeof body.memberId === "string" ? body.memberId.trim() : "";
  if (!memberId) {
    return NextResponse.json({ error: "memberId is required" }, { status: 400 });
  }

  // Validate goal + member.
  const [goal, link] = await Promise.all([
    db.goal.findFirst({ where: { id: goalId, householdId: id }, select: { id: true } }),
    db.householdMember.findUnique({
      where: { householdId_memberId: { householdId: id, memberId } },
      select: { id: true },
    }),
  ]);
  if (!goal) {
    return NextResponse.json({ error: "goal not found" }, { status: 404 });
  }
  if (!link) {
    return NextResponse.json(
      { error: "member is not a household member" },
      { status: 400 },
    );
  }

  const contribution = await db.goalContribution.create({
    data: { goalId, memberId, amount },
  });

  return NextResponse.json({ ok: true, contribution });
}

export async function DELETE(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; goalId: string }>;
  },
) {
  const { id, goalId } = await params;

  const existing = await db.goal.findFirst({
    where: { id: goalId, householdId: id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await db.goal.delete({ where: { id: goalId } });
  return NextResponse.json({ ok: true });
}
