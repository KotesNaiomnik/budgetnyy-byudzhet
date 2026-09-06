"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatMoney } from "@/lib/format";
import type { Debt } from "@/lib/finance";

export interface SettleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: { id: string; name: string }[];
  preset: Debt | null;
  currency: string;
  fmtDisp?: (amount: number) => string;
  dispSymbol?: string;
  onSubmit: (input: { fromId: string; toId: string; amount: number; note?: string }) => void;
  isSubmitting?: boolean;
}

export function SettleDialog({
  open,
  onOpenChange,
  members,
  preset,
  currency,
  fmtDisp,
  dispSymbol,
  onSubmit,
  isSubmitting,
}: SettleDialogProps) {
  const { toast } = useToast();
  const [fromId, setFromId] = React.useState("");
  const [toId, setToId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setFromId(preset?.fromId ?? "");
      setToId(preset?.toId ?? "");
      setAmount(preset ? String(preset.amount) : "");
      setNote("");
    }
  }, [open, preset]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!fromId || !toId) {
      toast({ title: "Выберите плательщика и получателя", variant: "destructive" });
      return;
    }
    if (fromId === toId) {
      toast({ title: "Нельзя выбрать одного участника дважды", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      toast({ title: "Введите корректную сумму", variant: "destructive" });
      return;
    }
    onSubmit({
      fromId,
      toId,
      amount: Math.round(amt),
      note: note.trim() || undefined,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Внести возврат</DialogTitle>
          <DialogDescription>
            Отметьте, что один участник вернул долг другому. Сальдо пересчитается автоматически.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="settle-from">Кто платит</Label>
              <Select value={fromId} onValueChange={setFromId}>
                <SelectTrigger id="settle-from" className="w-full">
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
              <Label htmlFor="settle-to">Кому</Label>
              <Select value={toId} onValueChange={setToId}>
                <SelectTrigger id="settle-to" className="w-full">
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
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settle-amount">Сумма, {dispSymbol ?? currency}</Label>
            <Input
              id="settle-amount"
              type="number"
              min={0.01}
              step={0.01}
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
            {preset ? (
              <p className="text-xs text-muted-foreground">
                Рекомендуемая сумма: {fmtDisp ? fmtDisp(preset.amount) : formatMoney(preset.amount, currency)}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settle-note">Комментарий (необязательно)</Label>
            <Input
              id="settle-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Например, за продукты"
              maxLength={120}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Сохраняем…" : "Отметить возврат"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
