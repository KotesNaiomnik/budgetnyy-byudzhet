import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { code?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!code) {
    return NextResponse.json({ error: "Укажите код" }, { status: 400 });
  }

  const household = await db.household.findUnique({
    where: { inviteCode: code },
    select: { id: true, name: true, inviteCode: true, currency: true, monthlyBudget: true, createdAt: true, ownerId: true },
  });
  if (!household) {
    return NextResponse.json({ error: "Группа не найдена" }, { status: 404 });
  }

  const user = await getCurrentUser(req);

  // Reuse the user's existing Member if one exists (after /bind, the user has
  // a single Member record shared between web and Telegram). This prevents
  // duplicate participants when the same person joins from both sides.
  let member;
  if (user) {
    member = await db.member.findFirst({
      where: { userId: user.id },
    });
    if (!member) {
      member = await db.member.create({
        data: { name: user.name, userId: user.id },
      });
    }
  } else {
    member = await db.member.create({ data: { name: "Веб-участник" } });
  }

  // Idempotent: if already a member, don't create a duplicate HouseholdMember.
  const existing = await db.householdMember.findUnique({
    where: {
      householdId_memberId: { householdId: household.id, memberId: member.id },
    },
    select: { id: true },
  });
  if (!existing) {
    await db.householdMember.create({
      data: { householdId: household.id, memberId: member.id },
    });
  }

  return NextResponse.json({ ok: true, household });
}
