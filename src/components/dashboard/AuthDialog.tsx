"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLogin, useRegister } from "./hooks";
import { toast } from "sonner";
import type { CurrentUser } from "./types";

export interface AuthDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultMode?: "login" | "register";
  onAuthenticated?: (user: CurrentUser) => void;
}

export function AuthDialog({
  open,
  onOpenChange,
  defaultMode = "login",
  onAuthenticated,
}: AuthDialogProps) {
  const [mode, setMode] = React.useState<"login" | "register">(defaultMode);

  React.useEffect(() => {
    if (open) setMode(defaultMode);
  }, [open, defaultMode]);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const loginMut = useLogin();
  const registerMut = useRegister();
  const pending = loginMut.isPending || registerMut.isPending;

  function reset() {
    setEmail("");
    setPassword("");
    setName("");
    setError(null);
  }

  function handleSuccess(user: CurrentUser) {
    toast.success(mode === "login" ? `С возвращением, ${user.name}!` : `Аккаунт создан: ${user.name}`);
    reset();
    onOpenChange(false);
    onAuthenticated?.(user);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "register") {
      registerMut.mutate(
        { email, password, name: name || undefined },
        {
          onSuccess: (res) => handleSuccess(res.user),
          onError: (err) => setError(err instanceof Error ? err.message : "Ошибка регистрации"),
        },
      );
    } else {
      loginMut.mutate(
        { email, password },
        {
          onSuccess: (res) => handleSuccess(res.user),
          onError: (err) => setError(err instanceof Error ? err.message : "Ошибка входа"),
        },
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Аккаунт</DialogTitle>
          <DialogDescription>
            Войдите или зарегистрируйтесь, чтобы сохранять свои группы и пользоваться сайтом с любого устройства.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => { setMode(v as "login" | "register"); setError(null); }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Вход</TabsTrigger>
            <TabsTrigger value="register">Регистрация</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-0">
            <form onSubmit={handleSubmit} className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="login-password">Пароль</Label>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Минимум 6 символов"
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Вход…" : "Войти"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register" className="mt-0">
            <form onSubmit={handleSubmit} className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="reg-name">Имя (необязательно)</Label>
                <Input
                  id="reg-name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Как вас зовут?"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-email">Email</Label>
                <Input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-password">Пароль</Label>
                <Input
                  id="reg-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Минимум 6 символов"
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Создаём…" : "Создать аккаунт"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <DialogFooter className="pt-2">
          <p className="text-xs text-muted-foreground text-center w-full">
            Демо-группа доступна без регистрации. Свои группы видны только вам.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
