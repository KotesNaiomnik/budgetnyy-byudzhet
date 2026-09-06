"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORY_LIST, resolveCategory, type CategoryDef } from "@/lib/categories";
import { useToast } from "@/hooks/use-toast";
import type { ExpenseView } from "./types";

export interface EditExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: ExpenseView | null;
  members: { id: string; name: string }[];
  currency: string;
  onSubmit: (input: {
    expenseId: string;
    data: {
      amount: number;
      category: string;
      description?: string;
      paidById: string;
      date?: string;
      participantIds?: string[];
    };
  }) => void;
  isSubmitting?: boolean;
}

function toDateInput(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const off = date.getTimezoneOffset();
  const local = new Date(date.getTime() - off * 60_000);
  return local.toISOString().slice(0, 10);
}

export function EditExpenseDialog({
  open,
  onOpenChange,
  expense,
  members,
  currency,
  onSubmit,
  isSubmitting,
}: EditExpenseDialogProps) {
  const { toast } = useToast();
  const [amount, setAmount] = React.useState("");
  const [category, setCategory] = React.useState<string>("products");
  const [description, setDescription] = React.useState("");
  const [paidById, setPaidById] = React.useState("");
  const [date, setDate] = React.useState<string>("");
  const [participantIds, setParticipantIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (open && expense) {
      setAmount(String(expense.amount));
      // If category is one of the keys, use it; else fall back to "other".
      const isKnown = CATEGORY_LIST.some((c) => c.key === expense.category);
      setCategory(isKnown ? expense.category : "other");
      setDescription(expense.description ?? "");
      setPaidById(expense.paidById);
      setDate(toDateInput(expense.date));
      setParticipantIds(
        expense.participantIds.length > 0
          ? expense.participantIds
          : members.map((m) => m.id),
      );
    }
  }, [open, expense, members]);

  function toggleParticipant(id: string) {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!expense) return;
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast({ title: "Введите корректную сумму", variant: "destructive" });
      return;
    }
    if (!paidById) {
      toast({ title: "Выберите, кто платил", variant: "destructive" });
      return;
    }
    onSubmit({
      expenseId: expense.id,
      data: {
        amount: Math.round(amt),
        category,
        description: description.trim() || undefined,
        paidById,
        date,
        participantIds,
      },
    });
    onOpenChange(false);
  }

  // The display label for the current category (may be a custom string).
  const currentCatDef: CategoryDef = resolveCategory(category);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Редактировать расход</DialogTitle>
          <DialogDescription>
            Измените данные расхода. Участники сохранятся.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-amount">Сумма, {currency}</Label>
              <Input
                id="edit-amount"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-date">Дата</Label>
              <Input
                id="edit-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-category">Категория</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="edit-category" className="w-full">
                <SelectValue>
                  <span className="flex items-center gap-2">
                    <currentCatDef.icon className={currentCatDef.color} />
                    {currentCatDef.label}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_LIST.map((c: CategoryDef) => (
                  <SelectItem key={c.key} value={c.key}>
                    <span className="flex items-center gap-2">
                      <c.icon className={c.color} />
                      {c.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-desc">Описание (необязательно)</Label>
            <Input
              id="edit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Например, Пятёрочка — еженедельный запас"
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-paidby">Кто платил</Label>
            <Select value={paidById} onValueChange={setPaidById}>
              <SelectTrigger id="edit-paidby" className="w-full">
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
          <div className="space-y-1.5">
            <Label>С кем поделили</Label>
            <div className="grid grid-cols-2 gap-2 rounded-md border p-3 sm:grid-cols-3">
              {members.map((m) => {
                const checked = participantIds.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleParticipant(m.id)}
                      aria-label={m.name}
                    />
                    <span className="truncate">{m.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
