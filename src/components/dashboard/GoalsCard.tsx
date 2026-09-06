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
import { Progress } from "@/components/ui/progress";
import { ChevronDown, PiggyBank, Plus, Trash2, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatMoney, formatDate } from "@/lib/format";
import {
  useContributeGoal,
  useCreateGoal,
  useDeleteGoal,
  useGoals,
} from "./hooks";
import type { MemberLite } from "./types";

export interface GoalsCardProps {
  householdId: string | null;
  members: MemberLite[];
  currency: string;
  fmtDisp?: (amount: number) => string;
}

export function GoalsCard({ householdId, members, currency, fmtDisp }: GoalsCardProps) {
  const fmt = fmtDisp ?? ((n: number) => formatMoney(n, currency));
  const goalsQuery = useGoals(householdId);
  const [open, setOpen] = React.useState(true);
  const goals = goalsQuery.data ?? [];

  return (
    <Card className="py-5">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-2 text-base">
            <CollapsibleTrigger asChild>
              <button
                className="flex flex-1 items-center gap-2 text-left outline-none"
                aria-label="Свернуть/развернуть цели"
              >
                <PiggyBank className="size-4 text-primary" />
                Копилки
                <Badge variant="secondary" className="tabular-nums">
                  {goals.length}
                </Badge>
                <ChevronDown
                  className={
                    "ml-auto size-4 text-muted-foreground transition-transform " +
                    (open ? "" : "-rotate-90")
                  }
                />
              </button>
            </CollapsibleTrigger>
            <CreateGoalDialog householdId={householdId} />
          </CardTitle>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-3">
            {goalsQuery.isLoading ? (
              <div className="h-20 animate-pulse rounded-md bg-muted" />
            ) : goals.length === 0 ? (
              <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                Пока нет целей. Создайте первую!
              </div>
            ) : (
              <ul className="space-y-2">
                {goals.map((g) => {
                  const over = g.pct >= 100;
                  return (
                    <li
                      key={g.id}
                      className="space-y-2 rounded-md border bg-card px-3 py-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{g.title}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {fmt(g.saved)} из{" "}
                            {fmt(g.targetAmount)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Badge
                            variant="outline"
                            className={
                              "tabular-nums " +
                              (over
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                : "")
                            }
                          >
                            {g.pct}%
                          </Badge>
                          <ContributeGoalDialog
                            householdId={householdId}
                            goalId={g.id}
                            members={members}
                            currency={currency}
                          />
                          <DeleteGoalButton householdId={householdId} goalId={g.id} />
                        </div>
                      </div>
                      <Progress
                        value={g.pct}
                        className={over ? "bg-emerald-500/15 [&>[data-slot=progress-indicator]]:bg-emerald-500" : "bg-primary/15"}
                      />
                      {(g.contributions?.length ?? 0) > 0 ? (
                        <ul className="space-y-0.5 text-[11px] text-muted-foreground">
                          {(g.contributions ?? []).slice(0, 3).map((c) => (
                            <li key={c.id} className="flex justify-between">
                              <span>
                                {c.memberName} • {formatDate(c.date)}
                              </span>
                              <span className="tabular-nums">
                                +{fmt(c.amount)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
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

function CreateGoalDialog({ householdId }: { householdId: string | null }) {
  const { toast } = useToast();
  const create = useCreateGoal(householdId);
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [target, setTarget] = React.useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Введите название цели", variant: "destructive" });
      return;
    }
    const amt = Number(target);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast({ title: "Введите корректную сумму", variant: "destructive" });
      return;
    }
    create.mutate(
      { title: title.trim(), targetAmount: Math.round(amt) },
      {
        onSuccess: () => {
          toast({ title: "Цель добавлена" });
          setTitle("");
          setTarget("");
          setOpen(false);
        },
        onError: (err) =>
          toast({
            title: "Не удалось создать цель",
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
          Новая цель
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Новая копилка</DialogTitle>
          <DialogDescription>
            Поставьте финансовую цель и копите вместе.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="goal-title">Название</Label>
            <Input
              id="goal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например, Отпуск в Турции"
              maxLength={120}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="goal-target">Целевая сумма, ₽</Label>
            <Input
              id="goal-target"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="0"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Создаём…" : "Создать"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ContributeGoalDialog({
  householdId,
  goalId,
  members,
  currency,
}: {
  householdId: string | null;
  goalId: string;
  members: MemberLite[];
  currency: string;
}) {
  const { toast } = useToast();
  const contribute = useContributeGoal(householdId);
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [memberId, setMemberId] = React.useState("");

  React.useEffect(() => {
    if (open && members.length > 0) {
      setMemberId((prev) => prev || members[0].id);
    }
  }, [open, members]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast({ title: "Введите корректную сумму", variant: "destructive" });
      return;
    }
    if (!memberId) {
      toast({ title: "Выберите участника", variant: "destructive" });
      return;
    }
    contribute.mutate(
      { goalId, amount: Math.round(amt), memberId },
      {
        onSuccess: () => {
          toast({ title: "Взнос добавлен" });
          setAmount("");
          setOpen(false);
        },
        onError: (err) =>
          toast({
            title: "Не удалось добавить взнос",
            description: err instanceof Error ? err.message : undefined,
            variant: "destructive",
          }),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="size-7 gap-1 p-0"
          aria-label="Внести взнос"
          title="Внести взнос"
        >
          <Wallet className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Внести взнос</DialogTitle>
          <DialogDescription>Кто и сколько внёс в копилку.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="contrib-member">Участник</Label>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger id="contrib-member" className="w-full">
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
            <Label htmlFor="contrib-amount">Сумма, {currency}</Label>
            <Input
              id="contrib-amount"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={contribute.isPending}>
              {contribute.isPending ? "Сохраняем…" : "Внести"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteGoalButton({
  householdId,
  goalId,
}: {
  householdId: string | null;
  goalId: string;
}) {
  const { toast } = useToast();
  const del = useDeleteGoal(householdId);
  return (
    <Button
      size="sm"
      variant="ghost"
      className="size-7 gap-1 p-0 text-muted-foreground hover:text-destructive"
      aria-label="Удалить цель"
      title="Удалить цель"
      disabled={del.isPending}
      onClick={() =>
        del.mutate(goalId, {
          onSuccess: () => toast({ title: "Цель удалена" }),
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
