"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useBindStatus, useCreateBindCode } from "./hooks";
import { toast } from "sonner";
import { Copy, Check, RefreshCw, Link2, CheckCircle2, ExternalLink } from "lucide-react";

export interface BindTelegramDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function BindTelegramDialog({ open, onOpenChange }: BindTelegramDialogProps) {
  const bindStatus = useBindStatus();
  const createCode = useCreateBindCode();
  const [copied, setCopied] = React.useState(false);
  const [code, setCode] = React.useState<string | null>(null);
  const [expiresAt, setExpiresAt] = React.useState<string | null>(null);
  const [remaining, setRemaining] = React.useState<string>("");
  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset state when dialog opens.
  React.useEffect(() => {
    if (open) {
      setCode(null);
      setExpiresAt(null);
      setCopied(false);
      bindStatus.refetch();
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
  }, [open]);

  // Countdown timer for the code.
  React.useEffect(() => {
    if (!expiresAt) return;
    const update = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      if (ms <= 0) {
        setRemaining("истёк");
        setCode(null);
        return;
      }
      const s = Math.floor(ms / 1000);
      const m = Math.floor(s / 60);
      const sec = s % 60;
      setRemaining(`${m}:${sec.toString().padStart(2, "0")}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  // Poll bind status while a code is active (so the dialog updates when the
  // user completes /bind in Telegram).
  React.useEffect(() => {
    if (!open || !code) return;
    pollRef.current = setInterval(() => {
      bindStatus.refetch();
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [open, code]);

  async function handleGenerate() {
    try {
      const res = await createCode.mutateAsync();
      setCode(res.code);
      setExpiresAt(res.expiresAt);
      setCopied(false);
      toast.success("Код сгенерирован");
    } catch (e) {
      toast.error("Не удалось создать код привязки");
    }
  }

  async function handleCopy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(`/bind ${code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Команда скопирована");
    } catch {
      /* ignore */
    }
  }

  const bound = bindStatus.data?.bound;
  const tgUsername = bindStatus.data?.tgUsername;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="size-5 text-primary" />
            Привязка Telegram
          </DialogTitle>
          <DialogDescription>
            Свяжите аккаунт сайта с Telegram-ботом, чтобы не дублироваться в
            участниках групп. После привязки вы — один человек и на сайте, и в боте.
          </DialogDescription>
        </DialogHeader>

        {bound ? (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <CheckCircle2 className="size-6 text-emerald-600 dark:text-emerald-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  Аккаунт привязан
                </p>
                <p className="text-xs text-muted-foreground">
                  {tgUsername ? `Telegram: @${tgUsername}` : "Telegram связан"}
                </p>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Check className="size-3" />
                активно
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Траты, добавленные в боте, будут видны на сайте под вашим именем,
              и наоборот. Дубликатов участников не будет.
            </p>
            <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
              Готово
            </Button>
          </div>
        ) : code ? (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-muted/40 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-2">
                Отправьте боту команду:
              </p>
              <div className="flex items-center justify-center gap-2">
                <code className="font-mono text-2xl font-bold tracking-widest text-primary">
                  /bind {code}
                </code>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  onClick={handleCopy}
                  title="Скопировать"
                >
                  {copied ? (
                    <Check className="size-4 text-emerald-600" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Код действителен: <span className="font-medium text-foreground">{remaining}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button asChild className="flex-1 gap-1.5">
                <a
                  href="https://t.me/Kopiiiilka_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="size-4" />
                  Открыть бота
                </a>
              </Button>
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={handleGenerate}
                disabled={createCode.isPending}
              >
                <RefreshCw className="size-4" />
                Новый код
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Ожидание привязки… После команды /bind в боте статус обновится автоматически.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-medium text-foreground">1.</span>
                <span>Сгенерируйте одноразовый код ниже.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-foreground">2.</span>
                <span>Откройте бота <a className="text-primary underline" href="https://t.me/Kopiiiilka_bot" target="_blank" rel="noopener noreferrer">@Kopiiiilka_bot</a>.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-foreground">3.</span>
                <span>Отправьте команду <code className="bg-muted px-1 rounded">/bind КОД</code>.</span>
              </li>
            </ol>
            <Button
              className="w-full gap-1.5"
              onClick={handleGenerate}
              disabled={createCode.isPending}
            >
              <Link2 className="size-4" />
              {createCode.isPending ? "Генерация…" : "Сгенерировать код"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
