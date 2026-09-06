"use client";

import * as React from "react";
import { formatMoney, formatMoneyPrecise } from "@/lib/format";

const CURRENCY_SYMBOL: Record<string, string> = {
  RUB: "₽", USD: "$", EUR: "€", GBP: "£", CNY: "¥",
  KZT: "₸", TRY: "₺", UAH: "₴", BYN: "Br", AED: "د.إ",
};

interface RateInfo {
  currency: string;
  rateToRub: number;
}

/**
 * Hook that provides a `fmt(amount)` function to display amounts in the chosen
 * display currency. Fetches exchange rates from /api/rates on mount. For RUB,
 * formats as integer; for foreign currencies, formats with 2 decimals.
 */
export function useFmtDisp(displayCurrency: string) {
  const [rates, setRates] = React.useState<Map<string, number>>(new Map());
  const [fetchedAt, setFetchedAt] = React.useState<Date | null>(null);

  React.useEffect(() => {
    if (displayCurrency === "RUB") return;
    fetch("/api/rates", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const map = new Map<string, number>();
        for (const r of data.rates ?? []) {
          map.set(r.currency, r.rateToRub);
          if (r.fetchedAt) setFetchedAt(new Date(r.fetchedAt));
        }
        setRates(map);
      })
      .catch(() => {});
  }, [displayCurrency]);

  const symbol = CURRENCY_SYMBOL[displayCurrency] ?? displayCurrency;
  const isConverted = displayCurrency !== "RUB";
  const rate = rates.get(displayCurrency) ?? 0;

  const fmt = React.useCallback(
    (amountRub: number): string => {
      if (displayCurrency === "RUB") {
        return formatMoney(amountRub, "₽");
      }
      const rate = rates.get(displayCurrency);
      if (!rate || rate <= 0) {
        return formatMoney(amountRub, "₽");
      }
      const converted = amountRub * rate;
      return formatMoneyPrecise(converted, symbol);
    },
    [displayCurrency, rates, symbol],
  );

  return { fmt, symbol, isConverted, rate, fetchedAt };
}
