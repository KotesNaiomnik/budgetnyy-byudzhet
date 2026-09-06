"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { MEMBER_COLORS } from "@/lib/categories";
import { formatMoneyCompact } from "@/lib/format";
import type { ExpenseView } from "./types";

export interface DynamicsChartProps {
  expenses: ExpenseView[];
  currency: string;
  fmtDisp?: (amount: number) => string;
}

const MONTHS_SHORT = [
  "янв", "фев", "мар", "апр", "май", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек",
];

interface MonthBucket {
  key: string;
  label: string;
  total: number;
}

function lastSixMonths(ref: Date = new Date()): { y: number; m: number; key: string; label: string }[] {
  const buckets: { y: number; m: number; key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    buckets.push({
      y: d.getFullYear(),
      m: d.getMonth(),
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: `${MONTHS_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
    });
  }
  return buckets;
}

export function DynamicsChart({ expenses, currency, fmtDisp }: DynamicsChartProps) {
  const fmtC = fmtDisp ?? ((n: number) => formatMoneyCompact(n, currency));
  const buckets = lastSixMonths();
  const map = new Map<string, number>();
  for (const b of buckets) map.set(b.key, 0);

  for (const e of expenses) {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (map.has(key)) map.set(key, (map.get(key) ?? 0) + e.amount);
  }

  const data: MonthBucket[] = buckets.map((b) => ({
    key: b.key,
    label: b.label,
    total: map.get(b.key) ?? 0,
  }));

  const hasData = data.some((d) => d.total > 0);
  const maxVal = Math.max(1, ...data.map((d) => d.total));

  if (!hasData) {
    return (
      <Card className="h-full py-5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-4 text-primary" />
            Динамика по месяцам
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
            Нет данных за последние 6 месяцев
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full py-5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="size-4 text-primary" />
          Динамика по месяцам
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={56}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickFormatter={(v: number) => fmtC(v)}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)" , fillOpacity: 0.3 }}
                formatter={(value: number) => [fmtC(value), "Потрачено"]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--popover)",
                  color: "var(--popover-foreground)",
                  fontSize: 12,
                }}
                itemStyle={{ color: "var(--popover-foreground)" }}
                labelStyle={{ color: "var(--popover-foreground)" }}
              />
              <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {data.map((d, i) => (
                  <Cell key={d.key} fill={MEMBER_COLORS[i % MEMBER_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
