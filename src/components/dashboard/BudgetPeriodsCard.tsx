"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, History } from "lucide-react";
import { formatMoney, formatDate } from "@/lib/format";
import { useBudgetPeriods } from "./hooks";

export interface BudgetPeriodsCardProps {
  householdId: string | null;
  currency: string;
  fmtDisp?: (amount: number) => string;
}

export function BudgetPeriodsCard({ householdId, currency, fmtDisp }: BudgetPeriodsCardProps) {
  const fmt = fmtDisp ?? ((n: number) => formatMoney(n, currency));
  const query = useBudgetPeriods(householdId);
  const [open, setOpen] = React.useState(false);
  const periods = query.data ?? [];

  if (periods.length === 0 && !query.isLoading) return null;

  return (
    <Card className="py-5">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-2 text-base">
            <CollapsibleTrigger asChild>
              <button
                className="flex flex-1 items-center gap-2 text-left outline-none"
                aria-label="Свернуть/развернуть прошлые бюджеты"
              >
                <History className="size-4 text-primary" />
                Прошлые бюджеты
                <Badge variant="secondary" className="tabular-nums">
                  {periods.length}
                </Badge>
                <ChevronDown
                  className={
                    "ml-auto size-4 text-muted-foreground transition-transform " +
                    (open ? "" : "-rotate-90")
                  }
                />
              </button>
            </CollapsibleTrigger>
          </CardTitle>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            {query.isLoading ? (
              <div className="h-16 animate-pulse rounded-md bg-muted" />
            ) : periods.length === 0 ? (
              <div className="flex h-16 items-center justify-center text-sm text-muted-foreground">
                История пуста.
              </div>
            ) : (
              <ul className="space-y-2">
                {periods.map((p) => {
                  const over = p.spent > p.amount;
                  const pct =
                    p.amount > 0 ? Math.min(200, Math.round((p.spent / p.amount) * 100)) : 0;
                  return (
                    <li
                      key={p.id}
                      className="space-y-1 rounded-md border bg-card px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {fmt(p.amount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(p.start)} — {formatDate(p.end)}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            "tabular-nums " +
                            (over
                              ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400"
                              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400")
                          }
                        >
                          {pct}%
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        потрачено {fmt(p.spent)} · остаток{" "}
                        {fmt(p.remaining)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-3 flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-muted-foreground"
                onClick={() => query.refetch()}
                disabled={query.isFetching}
              >
                {query.isFetching ? "Обновляем…" : "Обновить"}
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
