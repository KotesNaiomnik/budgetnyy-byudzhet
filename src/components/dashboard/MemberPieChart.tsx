"use client";

import {
  Pie,
  PieChart,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { MEMBER_COLORS } from "@/lib/categories";
import { formatMoney, formatMoneyCompact } from "@/lib/format";
import type { MemberSlice } from "@/lib/finance";
import type { BalanceResult } from "@/lib/finance";

export interface MemberPieChartProps {
  data: MemberSlice[];
  balances: BalanceResult;
  currency: string;
  fmtDisp?: (amount: number) => string;
}

export function MemberPieChart({
  data,
  balances,
  currency,
  fmtDisp,
}: MemberPieChartProps) {
  const fmt = fmtDisp ?? ((n: number) => formatMoney(n, currency));
  const fmtC = fmtDisp ?? ((n: number) => formatMoneyCompact(n, currency));
  const total = balances.totalSpent;

  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Пока нет расходов
      </div>
    );
  }

  // Map member id -> color (cycle through palette).
  const colorByMember = new Map<string, string>();
  data.forEach((d, i) => {
    colorByMember.set(d.memberId, MEMBER_COLORS[i % MEMBER_COLORS.length]);
  });

  return (
    <div className="grid gap-4 md:grid-cols-2 md:items-center">
      <div className="relative h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="name"
              innerRadius={45}
              outerRadius={90}
              paddingAngle={0}
              minAngle={3}
              stroke={null}
              strokeWidth={0}
            >
              {data.map((d) => (
                <Cell key={d.memberId} fill={colorByMember.get(d.memberId)} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [fmt(value), "Потрачено"]}
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
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              formatter={(value: string) => (
                <span className="text-xs text-muted-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-8">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            всего
          </span>
          <span className="text-sm font-semibold tabular-nums">
            {fmtC(total)}
          </span>
        </div>
      </div>

      <ul className="space-y-2">
        {balances.members.map((m) => {
          const slice = data.find((d) => d.memberId === m.id);
          const color = colorByMember.get(m.id) ?? "#94a3b8";
          const positive = m.balance >= 0;
          return (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                  aria-hidden
                />
                <span className="truncate text-sm font-medium">{m.name}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  вложил{" "}
                  <span className="font-medium text-foreground tabular-nums">
                    {fmt(slice?.amount ?? 0)}
                  </span>
                </span>
                <span
                  className={
                    "rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums " +
                    (positive
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "bg-rose-500/10 text-rose-700 dark:text-rose-400")
                  }
                  title={
                    positive
                      ? "Этому участнику должны"
                      : "Этот участник должен"
                  }
                >
                  {positive ? "ему должны" : "должен"}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
