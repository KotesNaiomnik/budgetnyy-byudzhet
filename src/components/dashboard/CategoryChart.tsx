"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Pie, PieChart, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from "recharts";
import { formatMoney } from "@/lib/format";
import type { CategorySlice } from "@/lib/finance";
import { PieChart as PieIcon } from "lucide-react";

const CHART_PALETTE = [
  "#10b981", "#f43f5e", "#14b8a6", "#f59e0b",
  "#ec4899", "#f97316", "#84cc16", "#a855f7",
  "#06b6d4", "#eab308", "#8b5cf6", "#22c55e",
];

const KNOWN_LABEL_HEX: Record<string, string> = {
  "Продукты": "#10b981",
  "Коммуналка": "#f59e0b",
  "Транспорт": "#14b8a6",
  "Рестораны": "#f43f5e",
  "Бытовые товары": "#f97316",
  "Развлечения": "#ec4899",
  "Прочее": "#64748b",
};

const CATEGORY_EMOJIS: Record<string, string> = {
  "Продукты": "🛒", "Коммуналка": "💡", "Транспорт": "🚕", "Рестораны": "🍽️",
  "Бытовые товары": "🧹", "Развлечения": "🎬", "Здоровье": "💊", "Красота": "💇",
  "Одежда": "👕", "Спорт": "⚽", "Дети": "🧸", "Путешествия": "✈️",
  "Электроника": "📱", "Подарки": "🎁", "Питомцы": "🐾", "Образование": "📚",
  "Налоги и штрафы": "🏛️", "Канцелярия": "✏️", "Дом и ремонт": "🔨", "Прочее": "📌",
};

export interface CategoryChartProps {
  data: CategorySlice[];
  currency: string;
  fmtDisp?: (amount: number) => string;
  chartType?: "pie" | "bar" | "hbar" | "area";
}

export function CategoryChart({ data, currency, fmtDisp, chartType = "pie" }: CategoryChartProps) {
  const fmt = fmtDisp ?? ((n: number) => formatMoney(n, currency));
  const total = data.reduce((s, d) => s + d.amount, 0);

  if (!data || data.length === 0) {
    return (
      <Card className="h-full py-5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <PieIcon className="size-4 text-primary" />
            Расходы по категориям
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            Нет данных
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d, i) => ({
    name: d.category,
    amount: d.amount,
    fill: KNOWN_LABEL_HEX[d.category] ?? CHART_PALETTE[i % CHART_PALETTE.length],
  }));

  const tooltipStyle = {
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--popover)",
    color: "var(--popover-foreground)",
    fontSize: 12,
  };
  const itemStyle = { color: "var(--popover-foreground)" };
  const labelStyle = { color: "var(--popover-foreground)" };

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <PieIcon className="size-4 text-primary" />
        <span className="text-sm font-medium">Расходы по категориям</span>
        <span className="ml-auto text-sm text-muted-foreground">{fmt(total)}</span>
      </div>

      {chartType === "pie" ? (
        <div className="relative h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="amount"
                nameKey="name"
                innerRadius={40}
                outerRadius={75}
                paddingAngle={0}
                minAngle={3}
                stroke={null}
                strokeWidth={0}
              >
                {chartData.map((d, i) => (
                  <Cell key={d.name} fill={d.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [fmt(value), String(name)]}
                contentStyle={tooltipStyle}
                itemStyle={itemStyle}
                labelStyle={labelStyle}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">всего</span>
            <span className="text-sm font-semibold tabular-nums">{fmt(total)}</span>
          </div>
        </div>
      ) : null}

      {/* Vertical bar chart (Столбцы) */}
      {chartType === "bar" ? (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: 8, right: 8, top: 10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} interval={0} angle={-25} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={56} />
              <Tooltip
                formatter={(value: number) => [fmt(value), "Потрачено"]}
                contentStyle={tooltipStyle}
                itemStyle={itemStyle}
                labelStyle={labelStyle}
                cursor={{ fill: "var(--muted)", fillOpacity: 0.3 }}
              />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {chartData.map((d) => (
                  <Cell key={d.name} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      {/* Horizontal bar chart (Строки) */}
      {chartType === "hbar" ? (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={100} />
              <Tooltip
                formatter={(value: number) => [fmt(value), "Потрачено"]}
                contentStyle={tooltipStyle}
                itemStyle={itemStyle}
                labelStyle={labelStyle}
                cursor={{ fill: "var(--muted)", fillOpacity: 0.3 }}
              />
              <Bar dataKey="amount" radius={[0, 6, 6, 0]} maxBarSize={28}>
                {chartData.map((d) => (
                  <Cell key={d.name} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      {chartType === "area" ? (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ left: 8, right: 16, top: 8, bottom: 40 }}>
              <defs>
                <linearGradient id="catArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} interval={0} angle={-25} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={56} />
              <Tooltip
                formatter={(value: number) => [fmt(value), "Потрачено"]}
                contentStyle={tooltipStyle}
                itemStyle={itemStyle}
                labelStyle={labelStyle}
              />
              <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} fill="url(#catArea)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      {/* Legend with emojis */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {chartData.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
            <span>{CATEGORY_EMOJIS[d.name] ?? "📌"}</span>
            <span className="text-muted-foreground">{d.name}</span>
            <span className="font-medium tabular-nums">{fmt(d.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
