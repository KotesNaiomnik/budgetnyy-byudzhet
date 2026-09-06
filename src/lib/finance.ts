// Pure finance helpers shared across the app (web API + dashboard).
// The Telegram bot ships an identical copy in its own src folder.

export interface BalanceMember {
  id: string;
  name: string;
  username?: string | null;
  /** Total this member paid for the household. */
  paid: number;
  /** This member's fair share of all expenses. */
  share: number;
  /** paid - share + settlements. Positive => others owe this member. */
  balance: number;
}

export interface Debt {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

export interface ExpenseRow {
  id: string;
  amount: number;
  category: string;
  description?: string | null;
  paidById: string;
  date: Date | string;
  /** Members who share this expense. If empty/undefined → split among ALL members. */
  participantIds?: string[];
}

export interface SettlementRow {
  fromId: string;
  toId: string;
  amount: number;
}

export interface MemberRow {
  id: string;
  name: string;
  username?: string | null;
}

export interface BalanceResult {
  members: BalanceMember[];
  /** Simplified, minimized list of who-owes-whom transfers. */
  debts: Debt[];
  totalSpent: number;
}

/**
 * Compute each member's saldo and simplify the resulting debts into the
 * minimum number of transfers (greedy largest-debtor -> largest-creditor).
 *
 * Every expense is split equally among all current household members.
 */
export function computeBalances(
  members: MemberRow[],
  expenses: ExpenseRow[],
  settlements: SettlementRow[],
): BalanceResult {
  const rows: BalanceMember[] = members.map((m) => ({
    id: m.id,
    name: m.name,
    username: m.username,
    paid: 0,
    share: 0,
    balance: 0,
  }));

  const idx = new Map(rows.map((r, i) => [r.id, i]));
  let totalSpent = 0;

  for (const e of expenses) {
    const i = idx.get(e.paidById);
    if (i === undefined) continue;
    rows[i].paid += e.amount;
    totalSpent += e.amount;
    // Split equally among ALL participants (including the payer).
    // If participants specified — use them; otherwise all members.
    const participants =
      e.participantIds && e.participantIds.length > 0
        ? e.participantIds.filter((pid) => idx.has(pid))
        : members.map((m) => m.id);
    const denom = participants.length || 1;
    const per = e.amount / denom;
    for (const pid of participants) {
      const pi = idx.get(pid);
      if (pi !== undefined) rows[pi].share += per;
    }
  }

  for (const r of rows) r.balance = r.paid - r.share;

  // Apply settlements: a payment from A to B of X increases A's balance
  // (A paid back debt) and decreases B's balance.
  for (const s of settlements) {
    const f = idx.get(s.fromId);
    const t = idx.get(s.toId);
    if (f === undefined || t === undefined) continue;
    rows[f].balance += s.amount;
    rows[t].balance -= s.amount;
  }

  // Round to avoid float noise.
  for (const r of rows) r.balance = Math.round(r.balance);

  // Simplify debts.
  const creditors = rows
    .filter((r) => r.balance > 0)
    .map((r) => ({ id: r.id, name: r.name, bal: r.balance }))
    .sort((a, b) => b.bal - a.bal);
  const debtors = rows
    .filter((r) => r.balance < 0)
    .map((r) => ({ id: r.id, name: r.name, bal: -r.balance }))
    .sort((a, b) => b.bal - a.bal);

  const debts: Debt[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i];
    const c = creditors[j];
    const amt = Math.min(d.bal, c.bal);
    if (amt > 0) {
      debts.push({
        fromId: d.id,
        fromName: d.name,
        toId: c.id,
        toName: c.name,
        amount: Math.round(amt),
      });
    }
    d.bal -= amt;
    c.bal -= amt;
    if (d.bal < 1) i++;
    if (c.bal < 1) j++;
  }

  return { members: rows, debts, totalSpent };
}

export interface CategorySlice {
  category: string;
  amount: number;
}

export function byCategory(expenses: ExpenseRow[]): CategorySlice[] {
  const map = new Map<string, number>();
  for (const e of expenses) {
    map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
  }
  return [...map.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export interface MemberSlice {
  memberId: string;
  name: string;
  amount: number;
}

export function byMember(expenses: ExpenseRow[], members: MemberRow[]): MemberSlice[] {
  const nameById = new Map(members.map((m) => [m.id, m.name]));
  const map = new Map<string, number>();
  for (const e of expenses) {
    map.set(e.paidById, (map.get(e.paidById) ?? 0) + e.amount);
  }
  return [...map.entries()]
    .map(([memberId, amount]) => ({
      memberId,
      name: nameById.get(memberId) ?? "—",
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Per-member SHARED slices for charts: a joint expense (with participants) is
 * split equally among its participants; an expense without participants is
 * split among ALL members. Each member's slice = sum of their shares across
 * all expenses. This is what the "по участникам" pie should show so a shared
 * expense counts for everyone who shared it, not only for the payer.
 */
export function byMemberShared(
  expenses: ExpenseRow[],
  members: MemberRow[],
): MemberSlice[] {
  const nameById = new Map(members.map((m) => [m.id, m.name]));
  const allIds = members.map((m) => m.id);
  const map = new Map<string, number>();
  for (const m of members) map.set(m.id, 0);
  for (const e of expenses) {
    const participants =
      e.participantIds && e.participantIds.length > 0
        ? e.participantIds.filter((pid) => nameById.has(pid))
        : allIds;
    const denom = participants.length || 1;
    const per = e.amount / denom;
    for (const pid of participants) {
      map.set(pid, (map.get(pid) ?? 0) + per);
    }
  }
  return [...map.entries()]
    .map(([memberId, amount]) => ({
      memberId,
      name: nameById.get(memberId) ?? "—",
      amount: Math.round(amount),
    }))
    .filter((s) => s.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

/** Weekly spend totals, oldest -> newest. */
export function weeklyTotals(expenses: ExpenseRow[]): { week: string; total: number }[] {
  const map = new Map<string, number>();
  for (const e of expenses) {
    const d = typeof e.date === "string" ? new Date(e.date) : e.date;
    const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    const week =
      Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    const key = `${tmp.getUTCFullYear()}-W${week.toString().padStart(2, "0")}`;
    map.set(key, (map.get(key) ?? 0) + e.amount);
  }
  return [...map.entries()]
    .map(([week, total]) => ({ week, total }))
    .sort((a, b) => a.week.localeCompare(b.week));
}
