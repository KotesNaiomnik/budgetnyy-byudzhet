"use client";

import * as React from "react";
import { useRates } from "./hooks";
import { CURRENCY_SYMBOL } from "@/lib/currency";
import { formatMoney, formatMoneyPrecise } from "@/lib/format";

/**
 * Hook that returns a `fmt` function for displaying amounts in the chosen
 * display currency. Amounts are stored in RUB; conversion uses cached rates.
 *
 * For RUB → formatMoney (integer). For foreign → formatMoneyPrecise (2 dec).
 */
export function useFmtDisp(displayCurrency: string): {
  fmt: (amount: number) => string;
  symbol: string;
  code: string;
  rate: number | null;
  isConverted: boolean;
} {
  const ratesQuery = useRates();
  const rates = ratesQuery.data ?? [];
  const code = (displayCurrency || "RUB").toUpperCase();
  const rate =
    code === "RUB" ? 1 : (rates.find((r) => r.currency === code)?.rateToRub ?? null);
  const symbol = CURRENCY_SYMBOL[code] ?? code;
  const isConverted = code !== "RUB" && rate !== null;

  const fmt = React.useCallback(
    (amount: number): string => {
      if (code === "RUB" || rate === null) {
        return formatMoney(amount, symbol);
      }
      const converted = amount * rate;
      return formatMoneyPrecise(converted, symbol);
    },
    [code, rate, symbol],
  );

  return { fmt, symbol, code, rate, isConverted };
}
