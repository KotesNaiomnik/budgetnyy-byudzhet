"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Trash2, Receipt, Pencil } from "lucide-react";
import { chartCategory } from "@/lib/categories";
import { formatDate, formatMoney } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { EditExpenseDialog } from "./EditExpenseDialog";
import type { ExpenseView } from "./types";

const CATEGORY_EMOJIS: Record<string, string> = {
  "Продукты": "🛒", "Коммуналка": "💡", "Транспорт": "🚕", "Рестораны": "🍽️",
  "Бытовые товары": "🧹", "Развлечения": "🎬", "Здоровье": "💊", "Красота": "💇",
  "Одежда": "👕", "Спорт": "⚽", "Дети": "🧸", "Путешествия": "✈️",
  "Электроника": "📱", "Подарки": "🎁", "Питомцы": "🐾", "Образование": "📚",
  "Налоги и штрафы": "🏛️", "Канцелярия": "✏️", "Дом и ремонт": "🔨", "Прочее": "📌",
};

function categoryEmoji(label: string): string {
  return CATEGORY_EMOJIS[label] ?? "📌";
}

export interface ExpensesTableProps {
  expenses: ExpenseView[];
  members: { id: string; name: string }[];
  currency: string;
  fmtDisp?: (amount: number) => string;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
  onEdit?: (input: {
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
  isEditing?: boolean;
  headerAction?: React.ReactNode;
}

export function ExpensesTable({
  expenses,
  members,
  currency,
  fmtDisp,
  onDelete,
  isDeleting,
  onEdit,
  isEditing,
  headerAction,
}: ExpensesTableProps) {
  const fmt = fmtDisp ?? ((n: number) => formatMoney(n, currency));
  const { toast } = useToast();
  const [editing, setEditing] = React.useState<ExpenseView | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);

  function handleDelete(id: string) {
    if (!onDelete) return;
    onDelete(id);
    toast({ title: "Расход удалён" });
  }

  function openEdit(e: ExpenseView) {
    if (!onEdit) return;
    setEditing(e);
    setEditOpen(true);
  }

  return (
    <>
      <Card className="h-full py-5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-2 text-base">
            <span className="flex items-center gap-2">
              <Receipt className="size-4 text-primary" />
              Последние расходы
            </span>
            {headerAction}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              Пока нет расходов — добавьте первый.
            </div>
          ) : (
            <div className="overflow-y-auto pr-1 scrollbar-thin">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead className="w-[80px]">Дата</TableHead>
                    <TableHead>Описание</TableHead>
                    <TableHead className="w-[140px]">Категория</TableHead>
                    <TableHead className="w-[100px]">Кто платил</TableHead>
                    <TableHead className="text-right w-[110px]">Сумма</TableHead>
                    {(onDelete || onEdit) ? <TableHead className="w-[80px]" /> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((e) => {
                    const catLabel = chartCategory(e.category);
                    const parts =
                      e.participantNames && e.participantNames.length > 0
                        ? e.participantNames
                        : [];
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="text-xs text-muted-foreground tabular-nums">
                          {formatDate(e.date)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm" title={e.description ?? ""}>
                              {e.description || (
                                <span className="text-muted-foreground/60">Нет описания</span>
                              )}
                            </span>
                            {parts.length > 0 ? (
                              <span
                                className="text-[10px] text-muted-foreground"
                                title={`Участники: ${parts.join(", ")}`}
                              >
                                👥 {parts.join(", ")}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1.5 font-normal">
                            <span>{categoryEmoji(catLabel)}</span>
                            {catLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{e.paidByName}</TableCell>
                        <TableCell className="text-right text-sm font-medium tabular-nums">
                          {fmt(e.amount)}
                        </TableCell>
                        {(onDelete || onEdit) ? (
                          <TableCell>
                            <div className="flex items-center gap-0.5">
                              {onEdit ? (
                                <TooltipProvider delayDuration={300}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="size-7 text-muted-foreground hover:text-primary"
                                        aria-label="Редактировать расход"
                                        title="Редактировать расход"
                                        disabled={isEditing}
                                        onClick={() => openEdit(e)}
                                      >
                                        <Pencil className="size-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Редактировать</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : null}
                              {onDelete ? (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-7 text-muted-foreground hover:text-destructive"
                                  aria-label="Удалить расход"
                                  title="Удалить расход"
                                  disabled={isDeleting}
                                  onClick={() => handleDelete(e.id)}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {onEdit ? (
        <EditExpenseDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          expense={editing}
          members={members}
          currency={currency}
          onSubmit={onEdit}
          isSubmitting={isEditing}
        />
      ) : null}
    </>
  );
}
