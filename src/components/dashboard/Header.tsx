"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Users, Wallet, Plus, KeyRound, ExternalLink, MoreVertical, Pencil, LogOut, Copy, Check, UserCircle, LogIn, UserPlus, Link2, Trash2, Sparkles } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { AuthDialog } from "./AuthDialog";
import { BindTelegramDialog } from "./BindTelegramDialog";
import { AiConfigDialog } from "./AiConfigDialog";
import { useCreateAndSelectHousehold, useJoinAndSelectHousehold, useLogout, useDeleteAccount } from "./hooks";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { CurrentUser, HouseholdListItem } from "./types";

export interface HeaderProps {
  households: HouseholdListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  displayCurrency: string;
  onCurrencyChange: (code: string) => void;
  onRename: () => void;
  onLeave: () => void;
  inviteCode: string | null;
  user: CurrentUser | null;
  onAuthChange?: () => void;
}

const CURRENCY_CODES = ["RUB", "USD", "EUR", "GBP", "CNY", "KZT", "TRY", "UAH", "BYN", "AED"];
const CURRENCY_SYMBOL: Record<string, string> = {
  RUB: "₽", USD: "$", EUR: "€", GBP: "£", CNY: "¥",
  KZT: "₸", TRY: "₺", UAH: "₴", BYN: "Br", AED: "د.إ",
};

export function getStoredDisplayCurrency(): string {
  if (typeof window === "undefined") return "RUB";
  return localStorage.getItem("displayCurrency") || "RUB";
}

export function setStoredDisplayCurrency(code: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("displayCurrency", code);
}

export function Header({
  households,
  selectedId,
  onSelect,
  displayCurrency,
  onCurrencyChange,
  onRename,
  onLeave,
  inviteCode,
  user,
  onAuthChange,
}: HeaderProps) {
  const [copied, setCopied] = React.useState(false);
  const [showCreate, setShowCreate] = React.useState(false);
  const [showJoin, setShowJoin] = React.useState(false);
  const [showAuth, setShowAuth] = React.useState(false);
  const [showBind, setShowBind] = React.useState(false);
  const [showDelete, setShowDelete] = React.useState(false);
  const [showAiConfig, setShowAiConfig] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<"login" | "register">("login");
  const [createName, setCreateName] = React.useState("");
  const [joinCode, setJoinCode] = React.useState("");
  const createMut = useCreateAndSelectHousehold(onSelect);
  const joinMut = useJoinAndSelectHousehold(onSelect);
  const logoutMut = useLogout();
  const deleteAccountMut = useDeleteAccount();

  function openAuth(mode: "login" | "register") {
    setAuthMode(mode);
    setShowAuth(true);
  }

  async function handleLogout() {
    try {
      await logoutMut.mutateAsync();
      toast.success("Вы вышли из аккаунта");
      onAuthChange?.();
    } catch {
      toast.error("Не удалось выйти");
    }
  }

  async function handleDeleteAccount() {
    try {
      await deleteAccountMut.mutateAsync();
      toast.success("Аккаунт удалён");
      setShowDelete(false);
      onAuthChange?.();
    } catch (e) {
      toast.error("Не удалось удалить аккаунт");
    }
  }

  async function handleCreate() {
    if (!createName.trim()) return;
    try {
      const res = await createMut.mutateAsync({ name: createName.trim() });
      toast.success(`Группа «${res.household.name}» создана`);
      setShowCreate(false);
      setCreateName("");
    } catch (e) {
      toast.error("Не удалось создать группу");
    }
  }

  async function handleJoin() {
    if (!joinCode.trim()) return;
    try {
      const res = await joinMut.mutateAsync(joinCode.trim().toUpperCase());
      toast.success(`Вы вступили в «${res.household.name}»`);
      setShowJoin(false);
      setJoinCode("");
    } catch (e) {
      toast.error("Группа с таким кодом не найдена");
    }
  }

  return (
    <header
      className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur"
      role="banner"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"
            aria-hidden
          >
            <Wallet className="size-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight sm:text-lg">
              Бюджетный бюджет
            </h1>
            <p className="text-xs text-muted-foreground">
              общий бюджет семьи и друзей
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={selectedId ?? undefined}
            onValueChange={(v) => onSelect(v)}
            disabled={households.length === 0}
          >
            <SelectTrigger
              className="min-w-[160px] gap-2 sm:min-w-[200px]"
              aria-label="Выбрать группу"
            >
              <Users className="size-4 text-muted-foreground" />
              <SelectValue placeholder="Выбрать группу" />
            </SelectTrigger>
            <SelectContent>
              {households.map((h) => (
                <SelectItem key={h.id} value={h.id}>
                  {h.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Invite code badge */}
          {inviteCode ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 font-mono"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(inviteCode);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                  toast.success("Код скопирован");
                } catch { /* ignore */ }
              }}
              title="Нажмите, чтобы скопировать код-приглашение"
            >
              <Badge variant="secondary" className="font-mono">
                {inviteCode}
              </Badge>
              {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5 text-muted-foreground" />}
            </Button>
          ) : null}

          {/* Group actions dropdown */}
          {selectedId ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5" aria-label="Действия с группой">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={onRename} className="gap-2">
                  <Pencil className="size-4" />
                  Переименовать
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLeave} className="gap-2 text-destructive">
                  <LogOut className="size-4" />
                  Выйти из группы
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {/* Currency selector */}
          <Select value={displayCurrency} onValueChange={onCurrencyChange}>
            <SelectTrigger className="w-[80px] gap-1" aria-label="Валюта">
              <span className="text-sm font-medium">
                {CURRENCY_SYMBOL[displayCurrency] ?? displayCurrency}
              </span>
            </SelectTrigger>
            <SelectContent>
              {CURRENCY_CODES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c} ({CURRENCY_SYMBOL[c]})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Создать</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowJoin(true)}
          >
            <KeyRound className="size-4" />
            <span className="hidden sm:inline">Код</span>
          </Button>

          {/* Auth: user menu or login/register buttons */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5" aria-label="Аккаунт">
                  <UserCircle className="size-4" />
                  <span className="hidden sm:inline max-w-[120px] truncate">{user.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowBind(true)} className="gap-2">
                  <Link2 className="size-4" />
                  Привязать Telegram
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowAiConfig(true)} className="gap-2">
                  <Sparkles className="size-4" />
                  AI-токен Z.ai
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive">
                  <LogOut className="size-4" />
                  Выйти из аккаунта
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowDelete(true)} className="gap-2 text-destructive">
                  <Trash2 className="size-4" />
                  Удалить аккаунт
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => openAuth("login")}
              >
                <LogIn className="size-4" />
                <span className="hidden sm:inline">Войти</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                className="gap-1.5"
                onClick={() => openAuth("register")}
              >
                <UserPlus className="size-4" />
                <span className="hidden sm:inline">Регистрация</span>
              </Button>
            </>
          )}

          <Button variant="default" size="sm" className="gap-1.5" asChild>
            <a
              href="https://t.me/Kopiiiilka_bot"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="size-4" />
              <span className="hidden sm:inline">Бот</span>
            </a>
          </Button>

          <ThemeToggle />
        </div>
      </div>

      {/* Auth dialog */}
      <AuthDialog
        open={showAuth}
        onOpenChange={setShowAuth}
        defaultMode={authMode}
        onAuthenticated={() => onAuthChange?.()}
      />

      {/* Bind Telegram dialog */}
      <BindTelegramDialog open={showBind} onOpenChange={setShowBind} />

      {/* AI config dialog */}
      <AiConfigDialog open={showAiConfig} onOpenChange={setShowAiConfig} />

      {/* Delete account confirmation */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить аккаунт?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие необратимо. Будут удалены все ваши группы, траты, цели и данные аккаунта.
              {""}
              Если вы привязаны к Telegram, история в боте сохранится, но связь с сайтом будет разорвана.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteAccount}
              disabled={deleteAccountMut.isPending}
            >
              {deleteAccountMut.isPending ? "Удаление…" : "Удалить навсегда"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create group dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать группу</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="create-name">Название группы</Label>
            <Input
              id="create-name"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Например: Семья, Квартира, Поездка"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreate} disabled={createMut.isPending || !createName.trim()}>
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join group dialog */}
      <Dialog open={showJoin} onOpenChange={setShowJoin}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Войти по коду</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="join-code">Код-приглашение</Label>
            <Input
              id="join-code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Например: ABC123"
              className="font-mono"
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJoin(false)}>
              Отмена
            </Button>
            <Button onClick={handleJoin} disabled={joinMut.isPending || !joinCode.trim()}>
              Войти
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
