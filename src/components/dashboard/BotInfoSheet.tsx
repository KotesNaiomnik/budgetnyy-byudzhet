"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle } from "lucide-react";

const COMMANDS: { cmd: string; desc: string }[] = [
  { cmd: "/start", desc: "Главное меню с кнопками." },
  { cmd: "/create название", desc: "Создать группу расходов." },
  { cmd: "/join КОД", desc: "Вступить в группу по коду-приглашению." },
  { cmd: "/groups", desc: "Список ваших групп, переключение." },
  { cmd: "/add СУММА КАТЕГОРИЯ описание", desc: "Добавить общий расход." },
  { cmd: "🎤 голосовое", desc: "Распознаю речь и добавлю трату." },
  { cmd: "🖼 фото чека", desc: "Распознаю итог и добавлю трату." },
  { cmd: "/balance", desc: "Кто кому должен после упрощения долгов." },
  { cmd: "/chart", desc: "Круговая диаграмма-картинка." },
  { cmd: "/settle @имя СУММА", desc: "Отметить возврат долга." },
  { cmd: "/budget СУММА", desc: "Установить месячный бюджет." },
  { cmd: "/members", desc: "Участники группы (можно удалить)." },
  { cmd: "/leave", desc: "Выйти из группы." },
  { cmd: "/ai", desc: "AI-анализ: оптимизация, напоминания, прогноз." },
];

export function BotInfoSheet() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <MessageCircle className="size-4" />
          <span className="hidden sm:inline">Telegram-бот</span>
          <span className="sm:hidden">Бот</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Telegram-бот «Семейный счёт»</SheetTitle>
          <SheetDescription>
            Бот ведёт общий бюджет в личных сообщениях. Создавайте группы,
            приглашайте близких по коду и ведите общие траты. Всё хранится в
            общей базе — изменения видны и на этом дашборде.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 overflow-y-auto px-4 pb-6">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs">
            <p className="font-medium text-foreground">Как пользоваться</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-muted-foreground">
              <li>Откройте бота @Kopiiiilka_bot в Telegram.</li>
              <li>Нажмите /start — появится главное меню с кнопками.</li>
              <li>
                <code className="rounded bg-muted px-1 py-0.5">/create</code>{" "}
                создаст группу; поделитесь кодом с близкими.
              </li>
              <li>
                Они введут{" "}
                <code className="rounded bg-muted px-1 py-0.5">/join КОД</code> —
                и присоединятся к бюджету.
              </li>
            </ol>
          </div>

          <p className="text-sm font-medium">Команды бота</p>
          <ul className="space-y-2">
            {COMMANDS.map((c) => (
              <li
                key={c.cmd}
                className="rounded-md border bg-card px-3 py-2 text-sm"
              >
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-foreground">
                  {c.cmd}
                </code>
                <p className="mt-1 text-xs text-muted-foreground">{c.desc}</p>
              </li>
            ))}
          </ul>

          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">
              Голосовые и фото в группе
            </p>
            <p className="mt-1">
              Чтобы бот видел 🎤 голосовые и 🖼 фото в Telegram-группе,
              отключите Privacy Mode:{" "}
              <Badge variant="outline" className="font-mono">
                @BotFather
              </Badge>{" "}
              → /setprivacy → @Kopiiiilka_bot → Disable. В личных сообщениях всё
              работает всегда.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
