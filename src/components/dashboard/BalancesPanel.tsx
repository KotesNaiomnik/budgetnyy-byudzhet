"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, HandCoins } from "lucide-react";
import { formatMoney } from "@/lib/format";
import type { BalanceResult, Debt } from "@/lib/finance";
import { SettleDialog } from "./SettleDialog";

export interface BalancesPanelProps {
  balances: BalanceResult;
  members: { id: string; name: string }[];
  currency: string;
  fmtDisp?: (amount: number) => string;
  dispSymbol?: string;
  onSettle: (input: { fromId: string; toId: string; amount: number; note?: string }) => void;
  isSettling?: boolean;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function BalancesPanel({
  balances,
  members,
  currency,
  fmtDisp,
  dispSymbol,
  onSettle,
  isSettling,
}: BalancesPanelProps) {
  const fmt = fmtDisp ?? ((n: number) => formatMoney(n, currency));
  const [open, setOpen] = React.useState(false);
  const [preset, setPreset] = React.useState<Debt | null>(null);

  function openFor(debt?: Debt) {
    setPreset(debt ?? null);
    setOpen(true);
  }

  const debts = balances.debts;

  return (
    <Card className="h-full py-5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <HandCoins className="size-4 text-primary" />
            Кто кому должен
          </span>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => openFor()}
            disabled={members.length < 2}
          >
            Внести возврат
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {debts.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <span className="text-3xl" aria-hidden>
              🎉
            </span>
            Все в расчёте
          </div>
        ) : (
          <ul className="space-y-2">
            {debts.map((d, i) => (
              <li
                key={`${d.fromId}-${d.toId}-${i}`}
                className="flex items-center gap-3 rounded-md border bg-card px-3 py-2"
              >
                <div className="flex items-center -space-x-2">
                  <Avatar className="size-7 border-2 border-background text-[10px]">
                    <AvatarFallback className="bg-primary/15 text-primary">
                      {initials(d.fromName)}
                    </AvatarFallback>
                  </Avatar>
                  <Avatar className="size-7 border-2 border-background text-[10px]">
                    <AvatarFallback className="bg-muted text-foreground">
                      {initials(d.toName)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    <span className="font-medium">{d.fromName}</span>
                    <ArrowRight className="mx-1 inline size-3 text-muted-foreground" />
                    <span className="font-medium">{d.toName}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">долг по общим расходам</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge
                    variant="secondary"
                    className="tabular-nums font-semibold"
                  >
                    {fmt(d.amount)}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs"
                    onClick={() => openFor(d)}
                  >
                    Отметить
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <SettleDialog
        open={open}
        onOpenChange={setOpen}
        members={members}
        preset={preset}
        currency={currency}
        fmtDisp={fmtDisp}
        dispSymbol={dispSymbol}
        onSubmit={onSettle}
        isSubmitting={isSettling}
      />
    </Card>
  );
}
