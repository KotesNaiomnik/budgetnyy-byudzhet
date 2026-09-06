// Shared dashboard types, mirroring the API responses.

import type {
  BalanceResult,
  CategorySlice,
  MemberSlice,
} from "@/lib/finance";

export interface HouseholdSummary {
  id: string;
  name: string;
  inviteCode: string;
  currency: string;
  monthlyBudget: number | null;
  memberCount: number;
}

export interface HouseholdListItem {
  id: string;
  name: string;
  inviteCode: string;
  currency: string;
  monthlyBudget: number | null;
  ownerId?: string | null;
  isOwned?: boolean;
  memberCount?: number;
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  createdAt?: string;
}

export interface MemberLite {
  id: string;
  name: string;
  username?: string | null;
}

export interface ExpenseView {
  id: string;
  amount: number;
  category: string;
  description: string | null;
  paidById: string;
  paidByName: string;
  date: string;
  participantIds: string[];
  participantNames: string[];
}

export interface SettlementView {
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
  note: string | null;
  date: string;
}

export interface HouseholdStats {
  totalSpent: number;
  spentThisMonth: number;
  expenseCount: number;
  budgetTotal: number | null;
  budgetRemaining: number | null;
  budgetUsedPct: number | null;
  memberCount: number;
}

export interface HouseholdDetail {
  household: {
    id: string;
    name: string;
    inviteCode: string;
    currency: string;
    monthlyBudget: number | null;
    budgetAmount: number | null;
    budgetStart: string | null;
    budgetEnd: string | null;
  };
  members: MemberLite[];
  expenses: ExpenseView[];
  settlements: SettlementView[];
  balances: BalanceResult;
  byCategory: CategorySlice[];
  byMember: MemberSlice[];
  byChartCategory: CategorySlice[];
  stats: HouseholdStats;
}

export interface AiInsightView {
  type: "optimization" | "reminders" | "forecast";
  content: string;
  createdAt: string;
}

export interface GoalContributionView {
  id: string;
  memberName: string;
  amount: number;
  date: string;
}

export interface GoalView {
  id: string;
  title: string;
  targetAmount: number;
  dueDate: string | null;
  saved: number;
  pct: number;
  contributions?: GoalContributionView[];
}

export interface RecurringView {
  id: string;
  amount: number;
  category: string;
  cadence: string;
  dayField: number;
  nextRunAt: string;
  paidByName: string;
}

export interface ScheduledView {
  id: string;
  amount: number;
  category: string;
  description: string | null;
  scheduledDate: string;
  paidByName: string;
  convertedAt: string | null;
}
