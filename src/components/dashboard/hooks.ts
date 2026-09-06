"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  AiInsightView,
  BudgetPeriodView,
  CurrentUser,
  ExpenseView,
  GoalView,
  HouseholdDetail,
  HouseholdListItem,
  RateView,
  RecurringView,
  ScheduledView,
} from "./types";

// ---------- fetchers ----------

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export const householdKeys = {
  all: ["households"] as const,
  list: () => [...householdKeys.all, "list"] as const,
  detail: (id: string | null) => [...householdKeys.all, "detail", id] as const,
  ai: (id: string | null) => [...householdKeys.all, "ai", id] as const,
  goals: (id: string | null) => [...householdKeys.all, "goals", id] as const,
  recurring: (id: string | null) => [...householdKeys.all, "recurring", id] as const,
  scheduled: (id: string | null) => [...householdKeys.all, "scheduled", id] as const,
  budgetPeriods: (id: string | null) => [...householdKeys.all, "budgetPeriods", id] as const,
  rates: () => ["rates"] as const,
};

// ---------- queries ----------

export function useHouseholds() {
  return useQuery({
    queryKey: householdKeys.list(),
    queryFn: async () => {
      const data = await jsonOrThrow<{ households: HouseholdListItem[]; user: CurrentUser | null }>(
        await fetch("/api/households", { cache: "no-store" }),
      );
      return data;
    },
  });
}

// ---------- auth ----------

export function useCurrentUser() {
  return useQuery({
    queryKey: ["auth", "me"] as const,
    queryFn: async () => {
      const data = await jsonOrThrow<{ user: CurrentUser | null }>(
        await fetch("/api/auth/me", { cache: "no-store" }),
      );
      return data.user;
    },
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string; password: string; name?: string }) => {
      return jsonOrThrow<{ user: CurrentUser }>(
        await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
      qc.invalidateQueries({ queryKey: householdKeys.list() });
    },
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string; password: string }) => {
      return jsonOrThrow<{ user: CurrentUser }>(
        await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
      qc.invalidateQueries({ queryKey: householdKeys.list() });
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      return jsonOrThrow<{ ok: true }>(
        await fetch("/api/auth/logout", { method: "POST" }),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
      qc.invalidateQueries({ queryKey: householdKeys.list() });
    },
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      return jsonOrThrow<{ ok: true }>(
        await fetch("/api/auth/account", { method: "DELETE" }),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
      qc.invalidateQueries({ queryKey: householdKeys.list() });
      qc.invalidateQueries({ queryKey: ["auth", "bind-status"] });
    },
  });
}

// ---------- AI config (Z.ai token refresh for localhost) ----------

export interface AiConfigInfo {
  hasConfig: boolean;
  baseUrl?: string | null;
  apiKey?: string | null;
  chatId?: string | null;
  userId?: string | null;
  tokenPreview?: string | null;
  tokenLength?: number;
}

export function useAiConfig() {
  return useQuery({
    queryKey: ["ai-config"] as const,
    queryFn: async () => {
      const data = await jsonOrThrow<AiConfigInfo>(
        await fetch("/api/ai-config", { cache: "no-store" }),
      );
      return data;
    },
  });
}

export function useUpdateAiConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: string) => {
      return jsonOrThrow<{ ok: true; message: string }>(
        await fetch("/api/ai-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config }),
        }),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-config"] });
    },
  });
}

// ---------- Telegram binding ----------

export interface BindStatus {
  bound: boolean;
  tgUsername: string | null;
  name: string | null;
}

export function useBindStatus() {
  return useQuery({
    queryKey: ["auth", "bind-status"] as const,
    queryFn: async () => {
      const data = await jsonOrThrow<BindStatus>(
        await fetch("/api/auth/bind-status", { cache: "no-store" }),
      );
      return data;
    },
  });
}

export function useCreateBindCode() {
  return useMutation({
    mutationFn: async () => {
      return jsonOrThrow<{ code: string; expiresAt: string }>(
        await fetch("/api/auth/bind-code", { method: "POST" }),
      );
    },
  });
}

export function useHousehold(id: string | null) {
  return useQuery({
    queryKey: householdKeys.detail(id),
    enabled: Boolean(id),
    queryFn: async () => {
      const data = await jsonOrThrow<HouseholdDetail>(
        await fetch(`/api/households/${id}`, { cache: "no-store" }),
      );
      return data;
    },
  });
}

export function useAiInsights(id: string | null) {
  return useQuery({
    queryKey: householdKeys.ai(id),
    enabled: Boolean(id),
    queryFn: async () => {
      const data = await jsonOrThrow<{ insights: AiInsightView[] }>(
        await fetch(`/api/households/${id}/ai`, { cache: "no-store" }),
      );
      return data.insights;
    },
  });
}

export function useGoals(id: string | null) {
  return useQuery({
    queryKey: householdKeys.goals(id),
    enabled: Boolean(id),
    queryFn: async () => {
      const data = await jsonOrThrow<{ goals: GoalView[] }>(
        await fetch(`/api/households/${id}/goals`, { cache: "no-store" }),
      );
      return data.goals;
    },
  });
}

export function useRecurring(id: string | null) {
  return useQuery({
    queryKey: householdKeys.recurring(id),
    enabled: Boolean(id),
    queryFn: async () => {
      const data = await jsonOrThrow<{ recurring: RecurringView[] }>(
        await fetch(`/api/households/${id}/recurring`, { cache: "no-store" }),
      );
      return data.recurring;
    },
  });
}

export function useScheduled(id: string | null) {
  return useQuery({
    queryKey: householdKeys.scheduled(id),
    enabled: Boolean(id),
    queryFn: async () => {
      const data = await jsonOrThrow<{ scheduled: ScheduledView[] }>(
        await fetch(`/api/households/${id}/scheduled`, { cache: "no-store" }),
      );
      return data.scheduled;
    },
  });
}

export function useBudgetPeriods(id: string | null) {
  return useQuery({
    queryKey: householdKeys.budgetPeriods(id),
    enabled: Boolean(id),
    queryFn: async () => {
      const data = await jsonOrThrow<{ periods: BudgetPeriodView[] }>(
        await fetch(`/api/households/${id}/budget-periods`, { cache: "no-store" }),
      );
      return data.periods;
    },
  });
}

export function useRates() {
  return useQuery({
    queryKey: householdKeys.rates(),
    queryFn: async () => {
      const data = await jsonOrThrow<{ rates: RateView[] }>(
        await fetch("/api/rates", { cache: "no-store" }),
      );
      return data.rates;
    },
  });
}

// ---------- mutations ----------

export function useCreateHousehold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; monthlyBudget?: number }) => {
      return jsonOrThrow<{ household: HouseholdListItem }>(
        await fetch("/api/households", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: householdKeys.list() });
    },
  });
}

export function useJoinHousehold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      return jsonOrThrow<{ ok: true; household: HouseholdListItem }>(
        await fetch("/api/households/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        }),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: householdKeys.list() });
    },
  });
}

// Wrapper that also selects the new group after creating/joining.
export function useCreateAndSelectHousehold(onSelect: (id: string) => void) {
  const create = useCreateHousehold();
  const originalMutate = create.mutateAsync;
  const createAndSelect = {
    ...create,
    mutateAsync: async (input: { name: string; monthlyBudget?: number }) => {
      const res = await originalMutate(input);
      if (res?.household?.id) onSelect(res.household.id);
      return res;
    },
  };
  return createAndSelect;
}

export function useJoinAndSelectHousehold(onSelect: (id: string) => void) {
  const join = useJoinHousehold();
  const originalMutate = join.mutateAsync;
  const joinAndSelect = {
    ...join,
    mutateAsync: async (code: string) => {
      const res = await originalMutate(code);
      if (res?.household?.id) onSelect(res.household.id);
      return res;
    },
  };
  return joinAndSelect;
}

export function useRemoveMember(id: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      return jsonOrThrow<{ ok: true }>(
        await fetch(`/api/households/${id}/members/${memberId}`, {
          method: "DELETE",
        }),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: householdKeys.detail(id) });
      qc.invalidateQueries({ queryKey: householdKeys.list() });
    },
  });
}

export function useAskAi(id: string | null) {
  return useMutation({
    mutationFn: async (question: string) => {
      return jsonOrThrow<{ ok: true; content: string }>(
        await fetch(`/api/households/${id}/ai`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "question", question }),
        }),
      );
    },
  });
}

export interface AddExpenseInput {
  amount: number;
  category: string;
  description?: string;
  paidById: string;
  date?: string;
  participantIds?: string[];
}

export function useAddExpense(id: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddExpenseInput) => {
      return jsonOrThrow<{ ok: true; expense: ExpenseView }>(
        await fetch(`/api/households/${id}/expenses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: householdKeys.detail(id) });
    },
  });
}

export interface EditExpenseInput {
  amount: number;
  category: string;
  description?: string;
  paidById: string;
  date?: string;
  participantIds?: string[];
}

export function useEditExpense(id: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { expenseId: string; data: EditExpenseInput }) => {
      return jsonOrThrow<{ ok: true; expense: ExpenseView }>(
        await fetch(`/api/households/${id}/expenses/${input.expenseId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input.data),
        }),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: householdKeys.detail(id) });
    },
  });
}

export function useDeleteExpense(id: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (expenseId: string) => {
      return jsonOrThrow<{ ok: true }>(
        await fetch(`/api/households/${id}/expenses/${expenseId}`, {
          method: "DELETE",
        }),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: householdKeys.detail(id) });
    },
  });
}

export interface AddSettlementInput {
  fromId: string;
  toId: string;
  amount: number;
  note?: string;
}

export function useAddSettlement(id: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddSettlementInput) => {
      return jsonOrThrow<{ ok: true }>(
        await fetch(`/api/households/${id}/settlements`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: householdKeys.detail(id) });
    },
  });
}

export function useSetBudget(id: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input:
      | { monthlyBudget: number | null }
      | { amount: number; periodDays: number }
      | { clear: true }) => {
      return jsonOrThrow<{ ok: true }>(
        await fetch(`/api/households/${id}/budget`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: householdKeys.detail(id) });
      qc.invalidateQueries({ queryKey: householdKeys.list() });
      qc.invalidateQueries({ queryKey: householdKeys.budgetPeriods(id) });
    },
  });
}

export function useAddMember(id: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; username?: string }) => {
      return jsonOrThrow<{ ok: true; member: { id: string; name: string } }>(
        await fetch(`/api/households/${id}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: householdKeys.detail(id) });
      qc.invalidateQueries({ queryKey: householdKeys.list() });
    },
  });
}

export function useDeleteMember(id: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      return jsonOrThrow<{ ok: true }>(
        await fetch(`/api/households/${id}/members/${memberId}`, {
          method: "DELETE",
        }),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: householdKeys.detail(id) });
      qc.invalidateQueries({ queryKey: householdKeys.list() });
    },
  });
}

// ----- Goals mutations -----

export function useCreateGoal(id: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; targetAmount: number; dueDate?: string }) => {
      return jsonOrThrow<{ ok: true }>(
        await fetch(`/api/households/${id}/goals`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: householdKeys.goals(id) });
    },
  });
}

export function useContributeGoal(id: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { goalId: string; amount: number; memberId: string }) => {
      return jsonOrThrow<{ ok: true }>(
        await fetch(`/api/households/${id}/goals/${input.goalId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: input.amount, memberId: input.memberId }),
        }),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: householdKeys.goals(id) });
    },
  });
}

export function useDeleteGoal(id: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (goalId: string) => {
      return jsonOrThrow<{ ok: true }>(
        await fetch(`/api/households/${id}/goals/${goalId}`, {
          method: "DELETE",
        }),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: householdKeys.goals(id) });
    },
  });
}

// ----- Recurring mutations -----

export function useCreateRecurring(id: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      amount: number;
      category: string;
      description?: string;
      paidById: string;
      cadence: "daily" | "weekly" | "monthly";
      dayField: number;
    }) => {
      return jsonOrThrow<{ ok: true }>(
        await fetch(`/api/households/${id}/recurring`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: householdKeys.recurring(id) });
    },
  });
}

export function useDeleteRecurring(id: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (recId: string) => {
      return jsonOrThrow<{ ok: true }>(
        await fetch(`/api/households/${id}/recurring/${recId}`, {
          method: "DELETE",
        }),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: householdKeys.recurring(id) });
    },
  });
}

// ----- Scheduled mutations -----

export function useCreateScheduled(id: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      amount: number;
      category: string;
      description?: string;
      paidById: string;
      scheduledDate: string;
      participantIds?: string[];
    }) => {
      return jsonOrThrow<{ ok: true }>(
        await fetch(`/api/households/${id}/scheduled`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: householdKeys.scheduled(id) });
    },
  });
}

export function useDeleteScheduled(id: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (schedId: string) => {
      return jsonOrThrow<{ ok: true }>(
        await fetch(`/api/households/${id}/scheduled/${schedId}`, {
          method: "DELETE",
        }),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: householdKeys.scheduled(id) });
    },
  });
}

// ----- AI -----

export type AiInsightType = "optimization" | "reminders" | "forecast";

export function useGenerateAi(id: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (type: AiInsightType) => {
      return jsonOrThrow<{ ok: true; type: AiInsightType; content: string; createdAt: string }>(
        await fetch(`/api/households/${id}/ai`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type }),
        }),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: householdKeys.ai(id) });
    },
  });
}

// ----- Rates refresh -----

export function useRefreshRates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      return jsonOrThrow<{ ok: true }>(
        await fetch("/api/rates/refresh", { method: "POST" }),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: householdKeys.rates() });
    },
  });
}

// ----- Seed -----

export function useSeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      return jsonOrThrow<{ ok: true; householdId: string }>(
        await fetch("/api/seed", { method: "POST" }),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: householdKeys.list() });
    },
  });
}

export function useLeaveGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { householdId: string; memberId: string }) => {
      return jsonOrThrow<{ ok: true }>(
        await fetch(`/api/households/${input.householdId}/leave`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId: input.memberId }),
        }),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: householdKeys.list() });
    },
  });
}

export function useRenameGroup(id: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      return jsonOrThrow<{ ok: true }>(
        await fetch(`/api/households/${id}/rename`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        }),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: householdKeys.list() });
      qc.invalidateQueries({ queryKey: householdKeys.detail(id) });
    },
  });
}

export function useEditMember(id: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { memberId: string; name: string; username?: string }) => {
      return jsonOrThrow<{ ok: true }>(
        await fetch(`/api/households/${id}/members/${input.memberId}/edit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: input.name, username: input.username }),
        }),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: householdKeys.detail(id) });
    },
  });
}

// ---- Voice / photo / file expense parse (via AI) ----

export function useParseExpenseVoice(id: string | null) {
  return useMutation({
    mutationFn: async (input: { audioBase64: string; members: { name: string; username?: string | null }[] }) => {
      return jsonOrThrow<{
        ok: true;
        amount: number;
        category: string;
        description: string;
        participantNames: string[];
      }>(
        await fetch(`/api/households/${id}/parse-voice`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }),
      );
    },
  });
}

export function useParseExpensePhoto(id: string | null) {
  return useMutation({
    mutationFn: async (input: { imageBase64: string; mime: string }) => {
      return jsonOrThrow<{
        ok: true;
        amount: number;
        category: string;
        description: string;
      }>(
        await fetch(`/api/households/${id}/parse-photo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }),
      );
    },
  });
}

export function useParseExpenseFile(id: string | null) {
  return useMutation({
    mutationFn: async (input: { fileBase64: string; mime: string }) => {
      return jsonOrThrow<{
        ok: true;
        amount: number;
        category: string;
        description: string;
      }>(
        await fetch(`/api/households/${id}/parse-file`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }),
      );
    },
  });
}
