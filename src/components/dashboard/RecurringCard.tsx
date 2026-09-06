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
import { ChevronDown, Plus, RefreshCcw, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/format";
import { CATEGORY_LIST, type CategoryDef } from "@/lib/categories";
import { CategorySelect } from "./CategorySelect";
import {
  useCreateRecurring,
  useDeleteRecurring,
  useRecurring,
} from "./hooks";
import type { MemberLite } from "./types";

const CADENCES: { value: "daily" | "weekly" | "monthly" | "yearly"; label: string }[] = [
  { value: "daily", label: "Ежедневно" },
  { value: "weekly", label: "Еженедельно" },
  { value: "monthly", label: "Ежемесячно" },
  { value: "yearly", label: "Ежегодно" },
];

function cadenceLabel(c: string): string {
  return CADENCES.find((x) => x.value === c)?.label ?? c;
}

export interface RecurringCardProps {
  householdId: string | null;
  members: MemberLite[];
  currency: string;
  fmtDisp?: (amount: number) => string;
  displayCurrency?: string;
  dispSymbol?: string;
  dispRate?: number;
}

export function RecurringCard({ householdId, members, currency, fmtDisp, displayCurrency = "RUB", dispSymbol = "₽", dispRate = 0 }: RecurringCardProps) {
  const fmt = fmtDisp ?? ((n: number) => formatMoney(n, currency));
  const recurringQuery = useRecurring(householdId);
  const [open, setOpen] = React.useState(false);
  const items = recurringQuery.data ?? [];

  return (
    <Card className="py-5">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-2 text-base">
            <CollapsibleTrigger asChild>
              <button
                className="flex flex-1 items-center gap-2 text-left outline-none"
                aria-label="Свернуть/развернуть регулярные расходы"
              >
                <RefreshCcw className="size-4 text-primary" />
                Регулярные расходы
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
            <CreateRecurringDialog householdId={householdId} members={members} currency={currency} displayCurrency={displayCurrency} dispSymbol={dispSymbol} dispRate={dispRate} />
          </CardTitle>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-2">
            {recurringQuery.isLoading ? (
              <div className="h-20 animate-pulse rounded-md bg-muted" />
            ) : items.length === 0 ? (
              <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                Нет регулярных расходов.
              </div>
            ) : (
              <ul className="space-y-2">
                {items.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {r.description || r.category}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {cadenceLabel(r.cadence)} • следующий:{" "}
                        {formatDateTime(r.nextRunAt)} • платит {r.paidByName}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Badge variant="secondary" className="tabular-nums">
                        {fmt(r.amount)}
                      </Badge>
                      <DeleteRecurringButton householdId={householdId} recId={r.id} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function CreateRecurringDialog({
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
  const create = useCreateRecurring(householdId);
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [category, setCategory] = React.useState<string>("products");
  const [description, setDescription] = React.useState("");
  const [paidById, setPaidById] = React.useState("");
  const [cadence, setCadence] = React.useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [dayField, setDayField] = React.useState<number>(1);

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
    create.mutate(
      {
        amount: displayCurrency === "RUB" || dispRate <= 0 ? Math.round(amt) : Math.round(amt / dispRate),
        category,
        description: description.trim() || undefined,
        paidById,
        cadence,
        dayField,
      },
      {
        onSuccess: () => {
          toast({ title: "Регулярный расход добавлен" });
          setAmount("");
          setDescription("");
          setOpen(false);
        },
        onError: (err) =>
          toast({
            title: "Не удалось добавить",
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
          Добавить
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Регулярный расход</DialogTitle>
          <DialogDescription>
            Расход будет автоматически создаваться по расписанию.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rec-amount">Сумма, {dispSymbol}</Label>
              <Input
                id="rec-amount"
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
              <Label htmlFor="rec-cadence">Период</Label>
              <Select
                value={cadence}
                onValueChange={(v) => setCadence(v as "daily" | "weekly" | "monthly" | "yearly")}
              >
                <SelectTrigger id="rec-cadence" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CADENCES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rec-category">Категория</Label>
              <CategorySelect value={category} onChange={setCategory} id="rec-category" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-day">
                {cadence === "weekly" ? "День недели (0–6)" : cadence === "monthly" ? "День месяца (1–31)" : cadence === "yearly" ? "—" : "—"}
              </Label>
              <Input
                id="rec-day"
                type="number"
                min={0}
                max={cadence === "weekly" ? 6 : 31}
                step={1}
                inputMode="numeric"
                value={String(dayField)}
                onChange={(e) => setDayField(Number(e.target.value) || 1)}
                disabled={cadence === "daily" || cadence === "yearly"}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rec-desc">Описание (необязательно)</Label>
            <Input
              id="rec-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Например, Аренда квартиры"
              maxLength={120}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rec-paidby">Кто платит</Label>
            <Select value={paidById} onValueChange={setPaidById}>
              <SelectTrigger id="rec-paidby" className="w-full">
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
              {create.isPending ? "Сохраняем…" : "Добавить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteRecurringButton({
  householdId,
  recId,
}: {
  householdId: string | null;
  recId: string;
}) {
  const { toast } = useToast();
  const del = useDeleteRecurring(householdId);
  return (
    <Button
      size="sm"
      variant="ghost"
      className="size-7 gap-1 p-0 text-muted-foreground hover:text-destructive"
      aria-label="Удалить регулярный расход"
      title="Удалить регулярный расход"
      disabled={del.isPending}
      onClick={() =>
        del.mutate(recId, {
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
