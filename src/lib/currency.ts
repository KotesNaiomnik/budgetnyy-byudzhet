// Multi-currency support: daily exchange-rate cache + conversion to RUB.
// Rates are cached in the ExchangeRate table and refreshed once per day.

import { db } from "@/lib/db";

const SUPPORTED = ["RUB", "USD", "EUR", "GBP", "CNY", "KZT", "TRY", "UAH", "BYN", "AED"] as const;
export const CURRENCY_SYMBOL: Record<string, string> = {
  RUB: "₽",
  USD: "$",
  EUR: "€",
  GBP: "£",
  CNY: "¥",
  KZT: "₸",
  TRY: "₺",
  UAH: "₴",
  BYN: "Br",
  AED: "د.إ",
};
export const CURRENCY_CODES = [...SUPPORTED];

/** Symbol for a code, fallback to the code itself. */
export function currencySymbol(code: string): string {
  return CURRENCY_SYMBOL[code] ?? code;
}

/**
 * Convert an amount in `fromCurrency` to RUB using cached rates.
 * RUB→RUB = 1. For others, rate = units of currency per 1 RUB, so
 * amount_in_rub = amount / rate.
 */
export async function toRub(amount: number, fromCurrency: string): Promise<number> {
  const code = (fromCurrency || "RUB").toUpperCase();
  if (code === "RUB") return amount;
  const row = await db.exchangeRate.findUnique({ where: { currency: code } });
  if (!row || row.rateToRub <= 0) return amount; // fallback: treat as RUB
  return amount / row.rateToRub;
}

/**
 * Convert `amount` from `fromCode` to `toCode` via RUB as the base.
 * amount_rub = toRub(amount, fromCode); result = amount_rub * rateToRub(toCode).
 * If a rate is missing, falls back to the original amount (no conversion).
 */
export async function convert(
  amount: number,
  fromCode: string,
  toCode: string,
): Promise<number> {
  const from = (fromCode || "RUB").toUpperCase();
  const to = (toCode || "RUB").toUpperCase();
  if (from === to) return amount;
  const inRub = await toRub(amount, from);
  if (to === "RUB") return inRub;
  const row = await db.exchangeRate.findUnique({ where: { currency: to } });
  if (!row || row.rateToRub <= 0) return inRub; // fallback: return RUB amount
  return inRub * row.rateToRub;
}

/** Human-readable label for a currency code, e.g. "USD ($)". */
export function currencyLabel(code: string): string {
  const c = (code || "RUB").toUpperCase();
  const sym = CURRENCY_SYMBOL[c] ?? c;
  if (c === "RUB") return "RUB (₽) — рубли";
  const names: Record<string, string> = {
    USD: "доллары", EUR: "евро", GBP: "фунты", CNY: "юани",
    KZT: "тенге", TRY: "лиры", UAH: "гривны", BYN: "бел. рубли", AED: "дирхамы",
  };
  return `${c} (${sym}) — ${names[c] ?? c}`;
}

/**
 * Convert an amount entered in `displayCurrency` to rubles (integer), for
 * storage in Expense.amount (which is always integer RUB). Rounds to nearest
 * ruble. If displayCurrency is RUB, returns the amount as-is (rounded).
 */
export async function toRubInt(
  amount: number,
  displayCurrency: string,
): Promise<number> {
  const to = (displayCurrency || "RUB").toUpperCase();
  if (to === "RUB") return Math.round(amount);
  const inRub = await convert(amount, to, "RUB");
  return Math.round(inRub);
}

/** Refresh all non-RUB rates from a free public API. Safe to call daily. */
export async function refreshExchangeRates(): Promise<void> {
  // open.er-api.com is free, no key, returns rates per 1 USD.
  const res = await fetch("https://open.er-api.com/v6/latest/USD");
  if (!res.ok) throw new Error(`rates fetch failed: HTTP ${res.status}`);
  const data = (await res.json()) as { rates?: Record<string, number> };
  const usdRates = data.rates ?? {};
  const usdToRub = usdRates["RUB"];
  if (!usdToRub) throw new Error("no RUB rate in response");
  for (const code of SUPPORTED) {
    if (code === "RUB") continue;
    const perUsd = usdRates[code];
    if (!perUsd) continue;
    // currency per 1 RUB: (currency/USD) / (RUB/USD)
    const rateToRub = perUsd / usdToRub;
    await db.exchangeRate.upsert({
      where: { currency: code },
      create: { currency: code, rateToRub },
      update: { rateToRub, fetchedAt: new Date() },
    });
  }
  console.log("[currency] exchange rates refreshed");
}

/** Ensure rates are fresh: refresh if the newest is older than 24h. */
export async function ensureRatesFresh(): Promise<void> {
  const newest = await db.exchangeRate.findFirst({
    orderBy: { fetchedAt: "desc" },
  });
  const stale =
    !newest || Date.now() - new Date(newest.fetchedAt).getTime() > 24 * 3600 * 1000;
  if (stale) {
    try {
      await refreshExchangeRates();
    } catch (e) {
      console.error("[currency] refresh failed:", e);
    }
  }
}
