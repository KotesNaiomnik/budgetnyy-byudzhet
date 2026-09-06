/** Format an integer amount with the given currency symbol, e.g. 1250 -> "1 250 ₽". */
export function formatMoney(amount: number, currency = "₽"): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? "-" : "";
  const abs = Math.abs(rounded);
  const grouped = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u2009");
  return `${sign}${grouped}\u00A0${currency}`;
}

/** Compact money, e.g. 12500 -> "12,5k ₽". */
export function formatMoneyCompact(amount: number, currency = "₽"): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M\u00A0${currency}`;
  if (abs >= 10_000) return `${(amount / 1000).toFixed(1)}k\u00A0${currency}`;
  return formatMoney(amount, currency);
}

/**
 * Format money with up to 2 decimal places (cents/kopecks). Used for converted
 * amounts in non-round currencies (e.g. USD shows "12.34 $"). Trailing zeros
 * are kept (12.50, not 12.5) so cents are always visible for foreign currency.
 * For RUB (and other round displays) use formatMoney (no decimals).
 */
export function formatMoneyPrecise(amount: number, currency = "₽"): string {
  const THIN_SPACE = "\u202F";
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  const rounded = Math.round(abs * 100) / 100;
  const s = rounded.toFixed(2);
  const [intPart, decPart] = s.split(".");
  let grouped = "";
  for (let i = 0; i < intPart.length; i++) {
    if (i > 0 && (intPart.length - i) % 3 === 0) grouped += THIN_SPACE;
    grouped += intPart[i];
  }
  return `${sign}${grouped}.${decPart}\u00A0${currency}`;
}

const MONTHS = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${formatDate(d)}, ${hh}:${mm}`;
}

/** ISO week key like "2025-W03" for grouping. */
export function weekKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${week.toString().padStart(2, "0")}`;
}

export function isSameMonth(date: Date | string, ref: Date = new Date()): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

export function daysInMonth(date: Date = new Date()): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}
