import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { refreshExchangeRates, CURRENCY_SYMBOL, CURRENCY_CODES } from "@/lib/currency";

export const dynamic = "force-dynamic";

export async function GET() {
  // Auto-refresh rates if the table is empty or stale (older than 24h).
  // This ensures currency conversion works on fresh databases without a
  // manual refresh trigger.
  try {
    const count = await db.exchangeRate.count();
    if (count === 0) {
      await refreshExchangeRates();
    } else {
      const newest = await db.exchangeRate.findFirst({
        orderBy: { fetchedAt: "desc" },
        select: { fetchedAt: true },
      });
      const stale =
        !newest ||
        Date.now() - new Date(newest.fetchedAt).getTime() > 24 * 3600 * 1000;
      if (stale) {
        await refreshExchangeRates();
      }
    }
  } catch (err) {
    // If the public rates API is unreachable, continue with whatever's in DB.
    console.error("[rates] auto-refresh failed:", err);
  }

  const rates = await db.exchangeRate.findMany();
  return NextResponse.json({
    rates: rates.map((r) => ({
      currency: r.currency,
      rateToRub: r.rateToRub,
      fetchedAt: r.fetchedAt,
      symbol: CURRENCY_SYMBOL[r.currency] ?? r.currency,
    })),
    codes: CURRENCY_CODES,
    symbols: CURRENCY_SYMBOL,
  });
}

export async function POST() {
  try {
    await refreshExchangeRates();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Не удалось обновить курсы" }, { status: 500 });
  }
}
