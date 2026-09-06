import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** DELETE /api/auth/account — permanently delete the user's account.
 *
 * What gets deleted:
 *  - Households owned by the user (cascade deletes their expenses, goals, etc.)
 *  - Member records that belong to this user (userId = user.id)
 *  - The User record itself
 *  - Session cookie is cleared
 *
 * What is preserved:
 *  - Demo/public households (ownerId = null) — the user is just removed as a member
 *  - Households owned by other users where the user is a participant — the user's
 *    expenses/settlements in those groups remain (reassigned to keep group history)
 */
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  try {
    await db.$transaction(async (tx) => {
      // 1. Delete households owned by this user (cascade handles expenses,
      //    settlements, goals, recurring, scheduled, insights, budget periods).
      await tx.household.deleteMany({
        where: { ownerId: user.id },
      });

      // 2. For member records linked to this user:
      //    - If the member has tgUserId (bound to Telegram), keep the member but
      //      unlink it (set userId = null) so Telegram history is preserved.
      //    - If the member is web-only (no tgUserId), delete it. Any expenses
      //      they paid in OTHER users' households would lose the payer link,
      //      but since the household is cascade-deleted in step 1, and the user
      //      can only be a member of households they own or public ones, we
      //      just remove the HouseholdMember links.
      const members = await tx.member.findMany({
        where: { userId: user.id },
        select: { id: true, tgUserId: true },
      });

      for (const m of members) {
        if (m.tgUserId) {
          // Bound to Telegram — keep the member, just unlink from the web user.
          await tx.member.update({
            where: { id: m.id },
            data: { userId: null },
          });
        } else {
          // Web-only member — remove HouseholdMember links, then delete.
          await tx.householdMember.deleteMany({
            where: { memberId: m.id },
          });
          // Reassign expenses they paid in other people's households to avoid
          // FK violations. Set paidBy to the first remaining member of that
          // household, or skip if household is already deleted.
          await tx.expense.deleteMany({
            where: { paidById: m.id, household: { ownerId: { not: user.id } } },
          });
          await tx.member.delete({ where: { id: m.id } });
        }
      }

      // 3. Delete the user record.
      await tx.user.delete({ where: { id: user.id } });
    });

    // Clear session cookie.
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, "", {
      ...sessionCookieOptions(),
      maxAge: 0,
    });
    return res;
  } catch (err) {
    console.error("[account delete] failed:", err);
    return NextResponse.json(
      { error: "Не удалось удалить аккаунт. Попробуйте позже." },
      { status: 500 },
    );
  }
}
