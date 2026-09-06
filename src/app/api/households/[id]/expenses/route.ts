import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CATEGORIES, type CategoryKey } from "@/lib/categories";
import { normalizeCategory } from "@/lib/text";

export const dynamic = "force-dynamic";

function isCategoryKey(v: unknown): v is CategoryKey {
  return typeof v === "string" && v in CATEGORIES;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: {
    amount?: unknown;
    category?: unknown;
    description?: unknown;
    paidById?: unknown;
    date?: unknown;
    participantIds?: unknown;
  } = {};
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

  // Category: accept one of the known keys (raw, stored as-is for back-compat)
  // or any arbitrary string (normalized for storage).
  let category: string;
  if (isCategoryKey(body.category)) {
    category = body.category;
  } else if (typeof body.category === "string" && body.category.trim()) {
    category = normalizeCategory(body.category);
  } else {
    return NextResponse.json({ error: "invalid category" }, { status: 400 });
  }

  const paidById =
    typeof body.paidById === "string" ? body.paidById.trim() : "";
  if (!paidById) {
    return NextResponse.json(
      { error: "paidById is required" },
      { status: 400 },
    );
  }

  // Validate that paidById is a household member.
  const link = await db.householdMember.findUnique({
    where: {
      householdId_memberId: { householdId: id, memberId: paidById },
    },
    select: { id: true },
  });
  if (!link) {
    return NextResponse.json(
      { error: "paidBy is not a household member" },
      { status: 400 },
    );
  }

  const description =
    typeof body.description === "string" && body.description.trim()
      ? body.description.trim().slice(0, 240)
      : null;

  let date: Date = new Date();
  if (typeof body.date === "string" && body.date.trim()) {
    const parsed = new Date(body.date);
    if (!Number.isNaN(parsed.getTime())) date = parsed;
  }

  // Participant ids: validate they're household members (dedup).
  const rawParticipants = Array.isArray(body.participantIds)
    ? body.participantIds.filter(
        (p): p is string => typeof p === "string" && p.trim().length > 0,
      )
    : [];
  const participantIds = [...new Set(rawParticipants)];

  if (participantIds.length > 0) {
    const validLinks = await db.householdMember.findMany({
      where: { householdId: id, memberId: { in: participantIds } },
      select: { memberId: true },
    });
    const valid = new Set(validLinks.map((l) => l.memberId));
    for (const pid of participantIds) {
      if (!valid.has(pid)) {
        return NextResponse.json(
          { error: `participant ${pid} is not a household member` },
          { status: 400 },
        );
      }
    }
  }

  const expense = await db.expense.create({
    data: {
      householdId: id,
      amount,
      category,
      description,
      paidById,
      date,
      participants:
        participantIds.length > 0
          ? {
              create: participantIds.map((memberId) => ({ memberId })),
            }
          : undefined,
    },
    include: { participants: { select: { memberId: true } } },
  });

  return NextResponse.json({
    ok: true,
    expense: {
      ...expense,
      participantIds: expense.participants.map((p) => p.memberId),
    },
  });
}
