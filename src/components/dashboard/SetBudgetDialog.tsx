"use client";

import * as React from "react";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatPeriod } from "@/lib/text";
import { formatDate } from "@/lib/format";

export type BudgetSubmit =
  | { kind: "monthly"; monthlyBudget: number | null }
  | { kind: "period"; amount: number; periodDays: number }
  | { kind: "clear" };

export interface SetBudgetDialogProps {
  currency: string;
  current?: number | null;
  onSubmit: (value: BudgetSubmit) => void;
  isSubmitting?: boolean;
  trigger?: React.ReactNode;
}

const PERIOD_PRESETS: { days: number; label: string }[] = [
  { days: 1, label: "1 день" },
  { days: 7, label: "1 неделя" },
  { days: 30, label: "1 месяц" },
  { days: 90, label: "3 месяца" },
  { days: 180, label: "6 месяцев" },
  { days: 365, label: "1 год" },
  { days: 730, label: "2 года" },
];

export function SetBudgetDialog({
  currency,
  current,
  onSubmit,
  isSubmitting,
  trigger,
}: SetBudgetDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<"monthly" | "period">("monthly");

  // Monthly state.
  const [monthly, setMonthly] = React.useState("");
  // Period state.
  const [periodAmount, setPeriodAmount] = React.useState("");
  const [periodDays, setPeriodDays] = React.useState<number>(30);
  const [customDays, setCustomDays] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setMonthly(current != null ? String(current) : "");
      setPeriodAmount(current != null ? String(current) : "");
      setPeriodDays(30);
      setCustomDays("");
      setTab("monthly");
    }
  }, [open, current]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (tab === "monthly") {
      if (monthly.trim() === "") {
        onSubmit({ kind: "monthly", monthlyBudget: null });
        setOpen(false);
        return;
      }
      const num = Number(monthly);
      if (!Number.isFinite(num) || num < 0) {
        toast({ title: "Введите корректную сумму", variant: "destructive" });
        return;
      }
      onSubmit({ kind: "monthly", monthlyBudget: Math.round(num) });
      setOpen(false);
    } else {
      // Period tab.
      const amt = Number(periodAmount);
      if (!Number.isFinite(amt) || amt <= 0) {
        toast({ title: "Введите корректную сумму", variant: "destructive" });
        return;
      }
      let days = periodDays;
      if (customDays.trim() !== "") {
        const cd = Number(customDays);
        if (!Number.isFinite(cd) || cd < 1 || cd > 365 * 5) {
          toast({
            title: "Срок должен быть от 1 до 1825 дней",
            variant: "destructive",
          });
          return;
        }
        days = Math.round(cd);
      }
      onSubmit({
        kind: "period",
        amount: Math.round(amt),
        periodDays: days,
      });
      setOpen(false);
    }
  }

  function handleClear() {
    onSubmit({ kind: "clear" });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon" className="size-7" aria-label="Изменить бюджет" title="Изменить бюджет">
            <Pencil className="size-3.5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Бюджет группы</DialogTitle>
          <DialogDescription>
            Задайте общий лимит трат. Можно на месяц или на произвольный срок.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "monthly" | "period")}>
            <TabsList className="w-full">
              <TabsTrigger value="monthly" className="flex-1">На месяц</TabsTrigger>
              <TabsTrigger value="period" className="flex-1">На срок</TabsTrigger>
            </TabsList>
            <TabsContent value="monthly" className="mt-3 space-y-1.5">
              <Label htmlFor="budget-monthly">Сумма, {currency}</Label>
              <Input
                id="budget-monthly"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={monthly}
                onChange={(e) => setMonthly(e.target.value)}
                placeholder="0 — без лимита"
              />
              <p className="text-xs text-muted-foreground">
                Лимит на текущий месяц. Оставьте пустым, чтобы убрать.
              </p>
            </TabsContent>
            <TabsContent value="period" className="mt-3 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="budget-period-amount">Сумма, {currency}</Label>
                <Input
                  id="budget-period-amount"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={periodAmount}
                  onChange={(e) => setPeriodAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Срок</Label>
                <div className="flex flex-wrap gap-1.5">
                  {PERIOD_PRESETS.map((p) => (
                    <Button
                      key={p.days}
                      type="button"
                      size="sm"
                      variant={periodDays === p.days && customDays.trim() === "" ? "default" : "outline"}
                      onClick={() => {
                        setPeriodDays(p.days);
                        setCustomDays("");
                      }}
                      className="gap-1"
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Label htmlFor="budget-custom-days" className="text-xs text-muted-foreground shrink-0">
                    Свой срок (дн.):
                  </Label>
                  <Input
                    id="budget-custom-days"
                    type="number"
                    min={1}
                    max={1825}
                    step={1}
                    inputMode="numeric"
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                    placeholder="напр. 45"
                    className="h-8 w-28"
                  />
                  {customDays.trim() !== "" ? (
                    <span className="text-xs text-muted-foreground">
                      = {formatPeriod(Number(customDays))}
                    </span>
                  ) : null}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={handleClear} disabled={isSubmitting}>
              Убрать бюджет
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Сохраняем…" : "Сохранить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Tiny helper for displaying a budget period's date range.
export function formatBudgetRange(start: string | Date, end: string | Date): string {
  const s = typeof start === "string" ? new Date(start) : start;
  const e = typeof end === "string" ? new Date(end) : end;
  return `${formatDate(s)} — ${formatDate(e)}`;
}
