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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, ChevronDown, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime, formatDate } from "@/lib/format";
import { CATEGORY_LIST, type CategoryDef } from "@/lib/categories";
import { CategorySelect } from "./CategorySelect";
import {
  useCreateScheduled,
  useDeleteScheduled,
  useScheduled,
} from "./hooks";
import type { MemberLite } from "./types";

export interface ScheduledCardProps {
  householdId: string | null;
  members: MemberLite[];
  currency: string;
  fmtDisp?: (amount: number) => string;
  displayCurrency?: string;
  dispSymbol?: string;
  dispRate?: number;
}

export function ScheduledCard({ householdId, members, currency, fmtDisp, displayCurrency = "RUB", dispSymbol = "₽", dispRate = 0 }: ScheduledCardProps) {
  const fmt = fmtDisp ?? ((n: number) => formatMoney(n, currency));
  const scheduledQuery = useScheduled(householdId);
  const [open, setOpen] = React.useState(false);
  const items = scheduledQuery.data ?? [];

  return (
    <Card className="py-5">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-2 text-base">
            <CollapsibleTrigger asChild>
              <button
                className="flex flex-1 items-center gap-2 text-left outline-none"
                aria-label="Свернуть/развернуть запланированные расходы"
              >
                <CalendarClock className="size-4 text-primary" />
                Запланированные
                <Badge variant="secondary" className="tabular-nums">
                  {items.length}
                </Badge>
                <ChevronDown
                  className={
                    "ml-auto size-4 text-muted-foreground transition-transform " +
                    (open ? "" : "-rotate-90")
                  }
                />
              </button>
            </CollapsibleTrigger>
            <CreateScheduledDialog householdId={householdId} members={members} currency={currency} displayCurrency={displayCurrency} dispSymbol={dispSymbol} dispRate={dispRate} />
          </CardTitle>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-2">
            {scheduledQuery.isLoading ? (
              <div className="h-20 animate-pulse rounded-md bg-muted" />
            ) : items.length === 0 ? (
              <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                Нет запланированных расходов.
              </div>
            ) : (
              <ul className="space-y-2">
                {items.map((s) => {
                  const isPast = new Date(s.scheduledDate).getTime() < Date.now();
                  return (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {s.description || s.category}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(s.scheduledDate)}
                          {isPast ? " (просрочено)" : ""} • платит {s.paidByName}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Badge variant="secondary" className="tabular-nums">
                          {fmt(s.amount)}
                        </Badge>
                        <DeleteScheduledButton householdId={householdId} schedId={s.id} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function todayIsoPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 10);
}

function CreateScheduledDialog({
  householdId,
  members,
  currency,
  displayCurrency = "RUB",
  dispSymbol = "₽",
  dispRate = 0,
}: {
  householdId: string | null;
  members: MemberLite[];
  currency: string;
  displayCurrency?: string;
  dispSymbol?: string;
  dispRate?: number;
}) {
  const { toast } = useToast();
  const create = useCreateScheduled(householdId);
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [category, setCategory] = React.useState<string>("products");
  const [description, setDescription] = React.useState("");
  const [paidById, setPaidById] = React.useState("");
  const [date, setDate] = React.useState<string>(todayIsoPlus(7));

  React.useEffect(() => {
    if (open && members.length > 0) {
      setPaidById((prev) => prev || members[0].id);
    }
  }, [open, members]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount.replace(",", "."));
    if (!Number.isFinite(amt) || amt <= 0) {
      toast({ title: "Введите корректную сумму", variant: "destructive" });
      return;
    }
    if (!paidById) {
      toast({ title: "Выберите, кто платит", variant: "destructive" });
      return;
    }
    if (!date) {
      toast({ title: "Выберите дату", variant: "destructive" });
      return;
    }
    create.mutate(
      {
        amount: displayCurrency === "RUB" || dispRate <= 0 ? Math.round(amt) : Math.round(amt / dispRate),
        category,
        description: description.trim() || undefined,
        paidById,
        scheduledDate: date,
      },
      {
        onSuccess: () => {
          toast({ title: "Запланировано" });
          setAmount("");
          setDescription("");
          setOpen(false);
        },
        onError: (err) =>
          toast({
            title: "Не удалось запланировать",
            description: err instanceof Error ? err.message : undefined,
            variant: "destructive",
          }),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Plus className="size-4" />
          Запланировать
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Запланировать расход</DialogTitle>
          <DialogDescription>
            Расход будет автоматически создан в указанную дату.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sched-amount">Сумма, {dispSymbol}</Label>
              <Input
                id="sched-amount"
                type="number"
                min={0.01}
                step={displayCurrency === "RUB" ? 1 : 0.01}
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sched-date">Дата</Label>
              <Input
                id="sched-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sched-category">Категория</Label>
            <CategorySelect value={category} onChange={setCategory} id="sched-category" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sched-desc">Описание (необязательно)</Label>
            <Input
              id="sched-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Например, Оплата интернета"
              maxLength={120}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sched-paidby">Кто платит</Label>
            <Select value={paidById} onValueChange={setPaidById}>
              <SelectTrigger id="sched-paidby" className="w-full">
                <SelectValue placeholder="Участник" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Сохраняем…" : "Запланировать"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteScheduledButton({
  householdId,
  schedId,
}: {
  householdId: string | null;
  schedId: string;
}) {
  const { toast } = useToast();
  const del = useDeleteScheduled(householdId);
  return (
    <Button
      size="sm"
      variant="ghost"
      className="size-7 gap-1 p-0 text-muted-foreground hover:text-destructive"
      aria-label="Удалить запланированный расход"
      title="Удалить запланированный расход"
      disabled={del.isPending}
      onClick={() =>
        del.mutate(schedId, {
          onSuccess: () => toast({ title: "Удалено" }),
          onError: (err) =>
            toast({
              title: "Не удалось удалить",
              description: err instanceof Error ? err.message : undefined,
              variant: "destructive",
            }),
        })
      }
    >
      <Trash2 className="size-4" />
    </Button>
  );
}

// Avoid unused import warning when formatDateTime isn't needed.
void formatDateTime;
