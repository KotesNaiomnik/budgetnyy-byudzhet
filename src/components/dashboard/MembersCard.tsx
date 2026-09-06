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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, UserPlus, Users, X, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatMoney } from "@/lib/format";
import type { BalanceResult, MemberLite } from "./types";

export interface MembersCardProps {
  members: MemberLite[];
  balances: BalanceResult;
  currency: string;
  inviteCode: string | null;
  fmtDisp?: (amount: number) => string;
  onAdd: (input: { name: string; username?: string }) => void;
  isAdding?: boolean;
  onRemove?: (memberId: string) => void;
  isRemoving?: boolean;
  onEdit?: (input: { memberId: string; name: string; username?: string }) => void;
  isEditing?: boolean;
}

export function MembersCard({
  members,
  balances,
  currency,
  inviteCode,
  fmtDisp,
  onAdd,
  isAdding,
  onRemove,
  isRemoving,
  onEdit,
  isEditing,
}: MembersCardProps) {
  const fmt = fmtDisp ?? ((n: number) => formatMoney(n, currency));
  const { toast } = useToast();
  const [open, setOpen] = React.useState(true);

  async function handleInvite() {
    if (!inviteCode) return;
    const link = `https://t.me/Kopiiiilka_bot?start=${inviteCode}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Присоединяйся к группе", text: `Код группы: ${inviteCode}`, url: link });
        return;
      } catch { /* cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(link);
      toast({ title: "Ссылка скопирована", description: "Отправьте её участникам" });
    } catch {
      toast({ title: `Код группы: ${inviteCode}`, description: "Передайте его участникам" });
    }
  }

  return (
    <Card className="py-5">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-2 text-base">
            <CollapsibleTrigger asChild>
              <button
                className="flex flex-1 items-center gap-2 text-left outline-none"
                aria-label="Свернуть/развернуть список участников"
              >
                <Users className="size-4 text-primary" />
                Участники
                <Badge variant="secondary" className="tabular-nums">
                  {members.length}
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
          <CardContent className="space-y-3">
            <ul className="space-y-2">
              {balances.members.map((m) => {
                const positive = m.balance >= 0;
                return (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {m.name}
                        {m.username ? (
                          <span className="ml-1.5 text-xs font-normal text-muted-foreground/60">
                            @{m.username}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        вложил{" "}
                        <span className="tabular-nums">
                          {fmt(m.paid)}
                        </span>{" "}
                        · доля{" "}
                        <span className="tabular-nums">
                          {fmt(m.share)}
                        </span>
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Badge
                        variant="outline"
                        className={
                          "tabular-nums font-semibold " +
                          (positive
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400")
                        }
                      >
                        {fmt(m.balance)}
                      </Badge>
                      {onEdit ? (
                        <EditMemberButton
                          member={m}
                          isEditing={isEditing}
                          onConfirm={(name, username) => onEdit({ memberId: m.id, name, username })}
                        />
                      ) : null}
                      {onRemove ? (
                        <RemoveMemberButton
                          name={m.name}
                          isRemoving={isRemoving}
                          onConfirm={() => onRemove(m.id)}
                        />
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>

            {inviteCode ? (
              <div className="border-t pt-3">
                <Button
                  onClick={handleInvite}
                  className="w-full gap-1.5"
                  variant="outline"
                >
                  <UserPlus className="size-4" />
                  Пригласить участника
                </Button>
                <p className="mt-1.5 text-center text-xs text-muted-foreground">
                  Код группы: <span className="font-mono font-medium">{inviteCode}</span>
                </p>
              </div>
            ) : null}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function RemoveMemberButton({
  name,
  isRemoving,
  onConfirm,
}: {
  name: string;
  isRemoving?: boolean;
  onConfirm: () => void;
}) {
  const { toast } = useToast();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="size-7 text-muted-foreground hover:text-destructive"
          aria-label={`Удалить участника ${name}`}
          title={`Удалить участника ${name}`}
          disabled={isRemoving}
        >
          <X className="size-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить участника «{name}»?</AlertDialogTitle>
          <AlertDialogDescription>
            Будут удалены все его расходы и возвраты в этой группе. Действие
            необратимо. Участник пропадёт из списка и балансов.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              onConfirm();
              toast({ title: "Участник удалён" });
            }}
          >
            Удалить
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function EditMemberButton({
  member,
  isEditing,
  onConfirm,
}: {
  member: MemberLite;
  isEditing?: boolean;
  onConfirm: (name: string, username?: string) => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(member.name);
  const [username, setUsername] = React.useState(member.username ?? "");

  React.useEffect(() => {
    if (open) {
      setName(member.name);
      setUsername(member.username ?? "");
    }
  }, [open, member]);

  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        className="size-7 text-muted-foreground hover:text-primary"
        aria-label={`Редактировать ${member.name}`}
        title="Редактировать"
        disabled={isEditing}
        onClick={() => setOpen(true)}
      >
        <Pencil className="size-3.5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать участника</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Имя</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-username">Username (необязательно)</Label>
              <Input
                id="edit-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="@username"
                maxLength={60}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
            <Button
              disabled={isEditing || !name.trim()}
              onClick={() => {
                onConfirm(name.trim(), username.trim() || undefined);
                toast({ title: "Участник обновлён" });
                setOpen(false);
              }}
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export type { MemberLite };
