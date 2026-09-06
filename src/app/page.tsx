"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import {
  useAddExpense,
  useAddMember,
  useAddSettlement,
  useAiInsights,
  useDeleteExpense,
  useDeleteMember,
  useEditExpense,
  useEditMember,
  useHousehold,
  useHouseholds,
  useLeaveGroup,
  useRenameGroup,
  useSeed,
  useSetBudget,
} from "@/components/dashboard/hooks";
import {
  Header,
  getStoredDisplayCurrency,
  setStoredDisplayCurrency,
} from "@/components/dashboard/Header";
import { Footer } from "@/components/dashboard/Footer";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  MemberPieChart,
} from "@/components/dashboard/MemberPieChart";
import { BalancesPanel } from "@/components/dashboard/BalancesPanel";
import { ExpensesTable } from "@/components/dashboard/ExpensesTable";
import { AddExpenseDialog } from "@/components/dashboard/AddExpenseDialog";
import { CategoryChart } from "@/components/dashboard/CategoryChart";
import { DynamicsChart } from "@/components/dashboard/DynamicsChart";
import { AiInsightsPanel } from "@/components/dashboard/AiInsightsPanel";
import { MembersCard } from "@/components/dashboard/MembersCard";
import { GoalsCard } from "@/components/dashboard/GoalsCard";
import { RecurringCard } from "@/components/dashboard/RecurringCard";
import { ScheduledCard } from "@/components/dashboard/ScheduledCard";
import { BudgetPeriodsCard } from "@/components/dashboard/BudgetPeriodsCard";
import { SetBudgetDialog, type BudgetSubmit } from "@/components/dashboard/SetBudgetDialog";
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
} from "@/components/ui/alert-dialog";
import { useFmtDisp } from "@/components/dashboard/useFmtDisp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Receipt,
  Users,
  Wallet,
  PiggyBank,
  Plus,
  Download,
  PieChart as PieIcon,
  TrendingUp,
  FileText,
  Pencil,
  LogOut,
  type LucideIcon,
} from "lucide-react";

const DEMO_CODE = "DEMO-FLAT";
const STORAGE_KEY = "semya-schyot.selectedId";

export default function Home() {
  const { toast } = useToast();
  const householdsQuery = useHouseholds();
  const seed = useSeed();

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [displayCurrency, setDisplayCurrency] = React.useState<string>("RUB");
  const seededRef = React.useRef(false);

  // Derive households array + current user from the combined query.
  const households = householdsQuery.data?.households ?? [];
  const user = householdsQuery.data?.user ?? null;

  // Load persisted selection + display currency.
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSelectedId(stored);
      setDisplayCurrency(getStoredDisplayCurrency());
    } catch {
      /* localStorage may be unavailable */
    }
  }, []);

  // Persist selection.
  React.useEffect(() => {
    if (selectedId) {
      try {
        localStorage.setItem(STORAGE_KEY, selectedId);
      } catch {
        /* ignore */
      }
    }
  }, [selectedId]);

  // Auto-seed demo data on first mount if no households exist.
  // (Server-side GET /api/households already auto-seeds, but this is a fallback
  // in case the server seed was skipped.)
  React.useEffect(() => {
    if (seededRef.current) return;
    if (householdsQuery.isLoading || seed.isPending) return;
    if (households.length === 0 && householdsQuery.data) {
      seededRef.current = true;
      seed.mutate(undefined, {
        onSuccess: () => {
          householdsQuery.refetch();
        },
        onError: (err) => {
          toast({
            title: "Не удалось загрузить демо-данные",
            description: err instanceof Error ? err.message : undefined,
            variant: "destructive",
          });
        },
      });
    }
  }, [households, householdsQuery.data, householdsQuery.isLoading, seed, toast]);

  // Auto-pick DEMO-FLAT or first household if nothing selected.
  React.useEffect(() => {
    if (households.length === 0) return;
    // Only auto-select if nothing is selected or the selected group is gone.
    if (selectedId && households.some((h) => h.id === selectedId)) return;
    const demo = households.find((h) => h.inviteCode === DEMO_CODE);
    setSelectedId(demo?.id ?? households[0].id);
  }, [households, selectedId]);

  // When a new group is created or joined via Header, the mutation
  // invalidates the list query. Once the list refetches and includes
  // the new group, make sure it stays selected.
  React.useEffect(() => {
    if (households.length === 0) return;
    // If selectedId is set but not in the list yet, the list may have
    // just refetched — do nothing, the user explicitly selected it.
  }, [households]);

  const householdQuery = useHousehold(selectedId);
  // Touch useAiInsights so the cache warms up.
  useAiInsights(selectedId);

  const addExpense = useAddExpense(selectedId);
  const editExpense = useEditExpense(selectedId);
  const deleteExpense = useDeleteExpense(selectedId);
  const addSettlement = useAddSettlement(selectedId);
  const setBudget = useSetBudget(selectedId);
  const addMember = useAddMember(selectedId);
  const deleteMember = useDeleteMember(selectedId);
  const editMember = useEditMember(selectedId);

  const { fmt: fmtDisp, symbol: dispSymbol, isConverted, rate: dispRate, fetchedAt: dispFetchedAt } = useFmtDisp(displayCurrency);

  // ----- mutation handlers with toasts -----
  const handleAddExpense = React.useCallback(
    (input: {
      amount: number;
      category: string;
      description?: string;
      paidById: string;
      date?: string;
      participantIds?: string[];
    }) => {
      addExpense.mutate(input, {
        onSuccess: () => toast({ title: "Расход добавлен" }),
        onError: (err) =>
          toast({
            title: "Не удалось добавить расход",
            description: err instanceof Error ? err.message : undefined,
            variant: "destructive",
          }),
      });
    },
    [addExpense, toast],
  );

  const handleEditExpense = React.useCallback(
    (input: {
      expenseId: string;
      data: {
        amount: number;
        category: string;
        description?: string;
        paidById: string;
        date?: string;
        participantIds?: string[];
      };
    }) => {
      editExpense.mutate(input, {
        onSuccess: () => toast({ title: "Расход обновлён" }),
        onError: (err) =>
          toast({
            title: "Не удалось обновить расход",
            description: err instanceof Error ? err.message : undefined,
            variant: "destructive",
          }),
      });
    },
    [editExpense, toast],
  );

  const handleDeleteExpense = React.useCallback(
    (id: string) => {
      deleteExpense.mutate(id, {
        onError: (err) =>
          toast({
            title: "Не удалось удалить расход",
            description: err instanceof Error ? err.message : undefined,
            variant: "destructive",
          }),
      });
    },
    [deleteExpense, toast],
  );

  const handleSettle = React.useCallback(
    (input: { fromId: string; toId: string; amount: number; note?: string }) => {
      addSettlement.mutate(input, {
        onSuccess: () => toast({ title: "Возврат записан" }),
        onError: (err) =>
          toast({
            title: "Не удалось записать возврат",
            description: err instanceof Error ? err.message : undefined,
            variant: "destructive",
          }),
      });
    },
    [addSettlement, toast],
  );

  const handleSetBudget = React.useCallback(
    (value: BudgetSubmit) => {
      let payload:
        | { monthlyBudget: number | null }
        | { amount: number; periodDays: number }
        | { clear: true };
      if (value.kind === "monthly") {
        payload = { monthlyBudget: value.monthlyBudget };
      } else if (value.kind === "period") {
        payload = { amount: value.amount, periodDays: value.periodDays };
      } else {
        payload = { clear: true };
      }
      setBudget.mutate(payload, {
        onSuccess: () => toast({ title: "Бюджет обновлён" }),
        onError: (err) =>
          toast({
            title: "Не удалось обновить бюджет",
            description: err instanceof Error ? err.message : undefined,
            variant: "destructive",
          }),
      });
    },
    [setBudget, toast],
  );

  const handleAddMember = React.useCallback(
    (input: { name: string; username?: string }) => {
      addMember.mutate(input, {
        onSuccess: () => toast({ title: "Участник добавлен" }),
        onError: (err) =>
          toast({
            title: "Не удалось добавить участника",
            description: err instanceof Error ? err.message : undefined,
            variant: "destructive",
          }),
      });
    },
    [addMember, toast],
  );

  const handleRemoveMember = React.useCallback(
    (memberId: string) => {
      deleteMember.mutate(memberId, {
        onSuccess: () => toast({ title: "Участник удалён" }),
        onError: (err) =>
          toast({
            title: "Не удалось удалить участника",
            description: err instanceof Error ? err.message : undefined,
            variant: "destructive",
          }),
      });
    },
    [deleteMember, toast],
  );

  const handleEditMember = React.useCallback(
    (input: { memberId: string; name: string; username?: string }) => {
      editMember.mutate(input, {
        onSuccess: () => toast({ title: "Участник обновлён" }),
        onError: (err) =>
          toast({
            title: "Не удалось обновить участника",
            description: err instanceof Error ? err.message : undefined,
            variant: "destructive",
          }),
      });
    },
    [editMember, toast],
  );

  const handleExport = React.useCallback(() => {
    if (!selectedId) return;
    window.open(`/api/households/${selectedId}/export`, "_blank");
  }, [selectedId]);

  const handleExportPdf = React.useCallback(() => {
    if (!selectedId) return;
    window.open(`/api/households/${selectedId}/export-pdf`, "_blank");
  }, [selectedId]);

  const leaveMut = useLeaveGroup();
  const renameMut = useRenameGroup(selectedId);
  const [showRename, setShowRename] = React.useState(false);
  const [renameValue, setRenameValue] = React.useState("");
  const [showLeave, setShowLeave] = React.useState(false);

  const handleDisplayCurrencyChange = React.useCallback((code: string) => {
    setDisplayCurrency(code);
    setStoredDisplayCurrency(code);
  }, []);

  const data = householdQuery.data;
  const isLoading =
    householdsQuery.isLoading ||
    householdQuery.isLoading ||
    householdQuery.isFetching ||
    (!selectedId && (seed.isPending || householdsQuery.isFetching));
  const currency = "₽";

  const handleRename = React.useCallback(async () => {
    if (!renameValue.trim() || !selectedId) return;
    try {
      await renameMut.mutateAsync(renameValue.trim());
      toast({ title: "Группа переименована" });
      setShowRename(false);
      setRenameValue("");
    } catch {
      toast({ title: "Не удалось переименовать", variant: "destructive" });
    }
  }, [renameValue, selectedId, renameMut, toast]);

  const handleLeave = React.useCallback(async () => {
    if (!selectedId || !data?.members?.[0]?.id) return;
    const memberId = data.members[0].id;
    try {
      await leaveMut.mutateAsync({ householdId: selectedId, memberId });
      toast({ title: "Вы вышли из группы" });
      setShowLeave(false);
      setSelectedId(null);
    } catch {
      toast({ title: "Не удалось выйти", variant: "destructive" });
    }
  }, [selectedId, data, leaveMut, toast]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header
        households={households}
        selectedId={selectedId}
        onSelect={setSelectedId}
        displayCurrency={displayCurrency}
        onCurrencyChange={handleDisplayCurrencyChange}
        onRename={() => {
          setRenameValue(data?.household?.name ?? "");
          setShowRename(true);
        }}
        onLeave={() => setShowLeave(true)}
        inviteCode={data?.household?.inviteCode ?? null}
        user={user}
        onAuthChange={() => householdsQuery.refetch()}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6">
        {isLoading || !data ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* Conversion note */}
            {isConverted ? (
              <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                Итоги отображаются в <span className="font-medium text-foreground">{dispSymbol} ({displayCurrency})</span>.
                {" "}Курс: 1 ₽ = {dispRate.toFixed(5)} {dispSymbol} (1 {displayCurrency} ≈ {Math.round(1 / dispRate)} ₽).
                {dispFetchedAt ? <> Актуален на: {dispFetchedAt.toLocaleDateString("ru-RU")} {dispFetchedAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}.</> : null}
              </div>
            ) : null}

            {/* Stat cards */}
            <section
              className="grid grid-cols-2 gap-4 lg:grid-cols-4"
              aria-label="Сводка по группе"
            >
              <StatCard
                label="Потрачено в этом месяце"
                value={fmtDisp(data.stats.spentThisMonth)}
                icon={Wallet}
                iconClassName="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              />
              <StatCard
                label="Участников"
                value={data.stats.memberCount}
                icon={Users}
                iconClassName="bg-amber-500/15 text-amber-600 dark:text-amber-400"
              />
              <StatCard
                label="Расходов"
                value={data.stats.expenseCount}
                icon={Receipt}
                iconClassName="bg-rose-500/15 text-rose-600 dark:text-rose-400"
              />
              <BudgetStatCard
                spentThisMonth={data.stats.spentThisMonth}
                budgetRemaining={data.stats.budgetRemaining}
                budgetUsedPct={data.stats.budgetUsedPct}
                budgetTotal={data.stats.budgetTotal}
                fmtDisp={fmtDisp}
                dispSymbol={dispSymbol}
                onSetBudget={handleSetBudget}
                isSubmittingBudget={setBudget.isPending}
              />
            </section>

            {/* Charts row 1 */}
            <section className="grid gap-6 lg:grid-cols-3">
              <Card className="py-5 lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Расходы по участникам</CardTitle>
                </CardHeader>
                <CardContent>
                  <MemberPieChart
                    data={data.byMember}
                    balances={data.balances}
                    currency={currency}
                    fmtDisp={fmtDisp}
                  />
                </CardContent>
              </Card>

              <BalancesPanel
                balances={data.balances}
                members={data.members}
                currency={currency}
                fmtDisp={fmtDisp}
                dispSymbol={dispSymbol}
                onSettle={handleSettle}
                isSettling={addSettlement.isPending}
              />
            </section>

            {/* Last expenses — full width */}
            <section>
              <ExpensesTable
                expenses={data.expenses}
                members={data.members}
                currency={currency}
                fmtDisp={fmtDisp}
                onDelete={handleDeleteExpense}
                isDeleting={deleteExpense.isPending}
                onEdit={handleEditExpense}
                isEditing={editExpense.isPending}
                headerAction={
                  <div className="flex items-center gap-2">
                    <AddExpenseDialog
                      members={data.members}
                      currency={currency}
                      displayCurrency={displayCurrency}
                      dispSymbol={dispSymbol}
                      dispRate={dispRate}
                      householdId={selectedId}
                      onSubmit={handleAddExpense}
                      isSubmitting={addExpense.isPending}
                    />
                  </div>
                }
              />
            </section>

            {/* Category chart — full width */}
            <section>
              <ChartsToggle
                byChartCategory={data.byChartCategory}
                expenses={data.expenses}
                currency={currency}
                fmtDisp={fmtDisp}
              />
            </section>

            {/* AI insights */}
            <section>
              <AiInsightsPanel householdId={selectedId} />
            </section>

            {/* Goals / Recurring / Scheduled */}
            <section className="grid gap-6 lg:grid-cols-3">
              <GoalsCard
                householdId={selectedId}
                members={data.members}
                currency={currency}
                fmtDisp={fmtDisp}
              />
              <RecurringCard
                householdId={selectedId}
                members={data.members}
                currency={currency}
                fmtDisp={fmtDisp}
                displayCurrency={displayCurrency}
                dispSymbol={dispSymbol}
                dispRate={dispRate}
              />
              <ScheduledCard
                householdId={selectedId}
                members={data.members}
                currency={currency}
                fmtDisp={fmtDisp}
                displayCurrency={displayCurrency}
                dispSymbol={dispSymbol}
                dispRate={dispRate}
              />
            </section>

            {/* Members + Export + Past budgets */}
            <section className="grid gap-6 lg:grid-cols-3">
              <MembersCard
                members={data.members}
                balances={data.balances}
                currency={currency}
                inviteCode={data.household.inviteCode}
                fmtDisp={fmtDisp}
                onAdd={handleAddMember}
                isAdding={addMember.isPending}
                onRemove={handleRemoveMember}
                isRemoving={deleteMember.isPending}
                onEdit={handleEditMember}
                isEditing={editMember.isPending}
              />
              <BudgetPeriodsCard
                householdId={selectedId}
                currency={currency}
                fmtDisp={fmtDisp}
              />
              <Card className="py-5">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Download className="size-4 text-primary" />
                    Экспорт и действия
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Выгрузите отчёт или управляйте группой.
                  </p>
                  <Button
                    onClick={handleExport}
                    className="w-full gap-1.5"
                    variant="outline"
                    disabled={!selectedId}
                  >
                    <Download className="size-4" />
                    Экспорт в CSV
                  </Button>
                  <Button
                    onClick={handleExportPdf}
                    className="w-full gap-1.5"
                    variant="outline"
                    disabled={!selectedId}
                  >
                    <FileText className="size-4" />
                    Экспорт в PDF
                  </Button>
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </main>

      <Footer />

      {/* Rename dialog */}
      <Dialog open={showRename} onOpenChange={setShowRename}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Переименовать группу</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Новое название"
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRename(false)}>
              Отмена
            </Button>
            <Button onClick={handleRename} disabled={renameMut.isPending || !renameValue.trim()}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave group dialog */}
      <AlertDialog open={showLeave} onOpenChange={setShowLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Выйти из группы?</AlertDialogTitle>
            <AlertDialogDescription>
              Ваши траты и возвраты в этой группе будут удалены. Действие необратимо.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleLeave}
              disabled={leaveMut.isPending}
            >
              Выйти
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ChartsToggle({
  byChartCategory,
  expenses,
  currency,
  fmtDisp,
}: {
  byChartCategory: { category: string; amount: number }[];
  expenses: { id: string; amount: number; date: string }[];
  currency: string;
  fmtDisp?: (amount: number) => string;
}) {
  const [tab, setTab] = React.useState<"chart" | "dynamics">("chart");
  const [chartType, setChartType] = React.useState<"pie" | "bar" | "hbar" | "area">("pie");
  return (
    <Card className="h-full py-5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "chart" | "dynamics")}>
            <TabsList className="w-full">
              <TabsTrigger value="chart" className="flex-1 gap-1">
                <PieIcon className="size-3.5" />
                График
              </TabsTrigger>
              <TabsTrigger value="dynamics" className="flex-1 gap-1">
                <TrendingUp className="size-3.5" />
                Динамика
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={(v) => setTab(v as "chart" | "dynamics")}>
          <TabsContent value="chart" className="mt-0">
            {tab === "chart" ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {([
                    { v: "pie", l: "Круговая" },
                    { v: "bar", l: "Столбцы" },
                    { v: "hbar", l: "Строки" },
                    { v: "area", l: "Область" },
                  ] as const).map((opt) => (
                    <Button
                      key={opt.v}
                      size="sm"
                      variant={chartType === opt.v ? "default" : "outline"}
                      className="h-7 px-2.5 text-xs"
                      onClick={() => setChartType(opt.v)}
                    >
                      {opt.l}
                    </Button>
                  ))}
                </div>
                <CategoryChart data={byChartCategory} currency={currency} fmtDisp={fmtDisp} chartType={chartType} />
              </div>
            ) : null}
          </TabsContent>
          <TabsContent value="dynamics" className="mt-0">
            <DynamicsChart expenses={expenses as never} currency={currency} fmtDisp={fmtDisp} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface BudgetStatCardProps {
  spentThisMonth: number;
  budgetRemaining: number | null;
  budgetUsedPct: number | null;
  budgetTotal: number | null;
  fmtDisp: (amount: number) => string;
  dispSymbol: string;
  onSetBudget: (v: BudgetSubmit) => void;
  isSubmittingBudget?: boolean;
}

function BudgetStatCard({
  spentThisMonth,
  budgetRemaining,
  budgetUsedPct,
  budgetTotal,
  fmtDisp,
  dispSymbol,
  onSetBudget,
  isSubmittingBudget,
}: BudgetStatCardProps) {
  const Icon: LucideIcon = PiggyBank;
  const hasBudget = budgetRemaining !== null && budgetUsedPct !== null;
  const over = hasBudget && (budgetUsedPct as number) >= 80;

  return (
    <StatCard
      label="Остаток бюджета"
      value={
        hasBudget ? (
          fmtDisp(budgetRemaining as number)
        ) : (
          <span className="text-base text-muted-foreground">не задан</span>
        )
      }
      hint={
        hasBudget ? (
          <span>{budgetUsedPct}% из {fmtDisp(budgetTotal ?? 0)}</span>
        ) : (
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() =>
              onSetBudget({ kind: "monthly", monthlyBudget: Math.round(spentThisMonth * 1.2) })
            }
          >
            задать бюджет
          </button>
        )
      }
      icon={Icon}
      iconClassName={
        over
          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
          : "bg-teal-500/15 text-teal-600 dark:text-teal-400"
      }
    >
      {hasBudget ? (
        <div className="space-y-1">
          <Progress
            value={budgetUsedPct as number}
            className={
              over
                ? "bg-rose-500/15 [&>[data-slot=progress-indicator]]:bg-rose-500"
                : "bg-primary/15"
            }
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>потрачено {fmtDisp(spentThisMonth)}</span>
            <SetBudgetDialog
              currency={dispSymbol}
              current={budgetTotal ?? null}
              onSubmit={onSetBudget}
              isSubmitting={isSubmittingBudget}
              trigger={
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs text-primary"
                >
                  изменить
                </Button>
              }
            />
          </div>
        </div>
      ) : (
        <SetBudgetDialog
          currency={dispSymbol}
          current={null}
          onSubmit={onSetBudget}
          isSubmitting={isSubmittingBudget}
          trigger={
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 text-xs"
            >
              <Plus className="size-3.5" />
              Задать бюджет
            </Button>
          }
        />
      )}
    </StatCard>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 w-full rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-96 w-full rounded-xl lg:col-span-2" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}
