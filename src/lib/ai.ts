import ZAI from "z-ai-web-dev-sdk";
import type { BalanceResult, ExpenseRow, MemberRow } from "./finance";
import { byCategory, weeklyTotals } from "./finance";
import { isGroqConfigured, groqChat, type GroqMessage } from "./groq";

let zaiPromise: Promise<unknown> | null = null;

// z-ai-web-dev-sdk MUST be used in the backend only.
async function getZai() {
  if (!zaiPromise) {
    zaiPromise = ZAI.create();
  }
  return zaiPromise as Promise<Awaited<ReturnType<typeof ZAI.create>>>;
}

/** Detect if we're likely on localhost (z-ai internal API unreachable).
 *  In that case we prefer Groq if configured. */
function preferGroq(): boolean {
  return isGroqConfigured();
}

interface HouseholdContext {
  name: string;
  currency: string;
  monthlyBudget: number | null;
  members: MemberRow[];
  expenses: ExpenseRow[];
  balances: BalanceResult;
  categoryLabels: Record<string, string>;
}

function categoryLabel(ctx: HouseholdContext, key: string): string {
  return ctx.categoryLabels[key] ?? key;
}

function buildSummary(ctx: HouseholdContext): string {
  const { members, expenses, balances } = ctx;
  const total = balances.totalSpent;
  const cats = byCategory(expenses)
    .map(
      (c) =>
        `- ${categoryLabel(ctx, c.category)}: ${c.amount} ${ctx.currency} (${(
          (c.amount / (total || 1)) *
          100
        ).toFixed(0)}%)`,
    )
    .join("\n");

  const memInfo = members
    .map((m) => {
      const b = balances.members.find((x) => x.id === m.id);
      return `- ${m.name}: вложил ${b?.paid ?? 0} ${ctx.currency}, доля ${Math.round(
        b?.share ?? 0,
      )} ${ctx.currency}, сальдо ${b?.balance ?? 0} ${ctx.currency}`;
    })
    .join("\n");

  const weeks = weeklyTotals(expenses)
    .slice(-6)
    .map((w) => `${w.week}: ${w.total}`)
    .join(", ");

  return [
    `Группа: ${ctx.name}`,
    `Участников: ${members.length}`,
    `Бюджет на месяц: ${ctx.monthlyBudget ?? "не задан"} ${ctx.currency}`,
    `Всего потрачено: ${total} ${ctx.currency}`,
    `Траты по категориям:\n${cats || "- нет данных"}`,
    `Траты по неделям (последние): ${weeks || "нет данных"}`,
    `Сальдо участников:\n${memInfo || "- нет данных"}`,
  ].join("\n");
}

/**
 * 1. Optimization: analyze shared spending patterns and propose concrete
 *    money-saving actions (e.g. weekly bulk grocery shopping saves ~15%).
 */
export async function generateOptimization(
  ctx: HouseholdContext,
): Promise<string> {
  const summary = buildSummary(ctx);
  const messages = [
    {
      role: "assistant" as const,
      content:
        "Ты — финансовый аналитик для семей и групп соседей, которые ведут общий бюджет. " +
        "Анализируешь общие траты и предлагаешь конкретные, измеримые способы оптимизации " +
        "(оптовые закупки, объединение подписок, снижение коммуналки и т.п.). " +
        "Отвечай на русском языке, кратко, по делу, в Markdown. " +
        "Давай 3-5 пунктов, каждый с примерной экономией в процентах или рублях. " +
        "Не выдумывай точные цифры, если данных мало — используй слово «до».",
    },
    {
      role: "user" as const,
      content:
        `Проанализируй траты группы и предложи оптимизацию.\n\n${summary}\n\n` +
        `Выдели самую затратную категорию и предложи для неё 1-2 конкретных действия. ` +
        `Заверши одной строкой-итогом с общей потенциальной экономией.`,
    },
  ];

  return runChat(messages, fallbackOptimization(ctx));
}

/**
 * 2. Reminders: generate polite, human-readable debt reminders for each
 *    debtor, so no one feels awkward asking for money back.
 */
export async function generateReminders(
  ctx: HouseholdContext,
): Promise<string> {
  const debts = ctx.balances.debts;
  const debtList =
    debts.length === 0
      ? "Долгов нет — все расчётены."
      : debts
          .map(
            (d) =>
              `- ${d.fromName} должен ${d.toName}: ${d.amount} ${ctx.currency}`,
          )
          .join("\n");

  const messages = [
    {
      role: "assistant" as const,
      content:
        "Ты помогаешь группе друзей/семье вежливо напомнить о долгах по общим расходам. " +
        "Сформируй короткие, дружелюбные, тактичные напоминания — без давления, с улыбкой, " +
        "предлагая удобный момент вернуть долг. Пиши на русском, в Markdown. " +
        "Каждое напоминание — 1-2 предложения, обращение по имени.",
    },
    {
      role: "user" as const,
      content:
        `Сформируй вежливые напоминания о долгах для группы «${ctx.name}».\n` +
        `Текущие долги:\n${debtList}\n\n` +
        `Для каждой пары должник→кому придумай мягкое напоминание. ` +
        `Если долгов нет — напиши, что все в расчёте и можно расслабиться.`,
    },
  ];

  return runChat(messages, fallbackReminders(ctx));
}

/**
 * 3. Forecast: predict when the shared monthly budget will hit a critical
 *    point, based on the current spending rate.
 */
export async function generateForecast(ctx: HouseholdContext): Promise<string> {
  const now = new Date();
  const monthExpenses = ctx.expenses.filter((e) => {
    const d = typeof e.date === "string" ? new Date(e.date) : e.date;
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const spentThisMonth = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const dayOfMonth = now.getDate();
  const dailyRate = dayOfMonth > 0 ? spentThisMonth / dayOfMonth : 0;
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const projected = Math.round(dailyRate * daysInMonth);
  const budget = ctx.monthlyBudget;

  const stats = [
    `Потрачено в текущем месяце: ${spentThisMonth} ${ctx.currency}`,
    `Прошло дней: ${dayOfMonth} из ${daysInMonth}`,
    `Средний расход в день: ${Math.round(dailyRate)} ${ctx.currency}`,
    `Прогноз на конец месяца: ${projected} ${ctx.currency}`,
    budget !== null
      ? `Бюджет: ${budget} ${ctx.currency} (остаток ${budget - spentThisMonth} ${ctx.currency})`
      : "Бюджет не задан",
  ].join("\n");

  const messages = [
    {
      role: "assistant" as const,
      content:
        "Ты финансовый прогнозист для общего бюджета семьи/группы. " +
        "По скорости трат предсказываешь, когда общий бюджет подойдёт к критической точке " +
        "(например, 80% израсходовано или деньги закончатся до конца месяца). " +
        "Отвечай на русском, в Markdown, конкретно: дату или количество дней, уровень риска и 1 совет. " +
        "Если бюджета нет — оценивай по среднему дневному расходу.",
    },
    {
      role: "user" as const,
      content:
        `Группа «${ctx.name}».\n${stats}\n\n` +
        `Оцени, когда бюджет подойдёт к критической точке, и дай прогноз. ` +
        `Заверши строкой: «⚠️ Уровень риска: низкий/средний/высокий».`,
    },
  ];

  return runChat(messages, fallbackForecast(spentThisMonth, projected, budget, ctx.currency));
}

// --- Free-form Q&A ---

/**
 * Free-form Q&A: answer a user's question about the group's budget, finances,
 * debts, optimization, etc. The group's data summary is built locally (no LLM)
 * and injected into the prompt, so the model answers with real numbers. Single
 * LLM call, no conversation history — keeps load predictable.
 */
export async function answerBudgetQuestion(
  question: string,
  ctx: HouseholdContext,
): Promise<string> {
  const summary = buildSummary(ctx);
  const messages = [
    {
      role: "assistant" as const,
      content:
        "Ты — финансовый ассистент для семьи или группы друзей, которые ведут общий бюджет в Telegram-боте. " +
        "Отвечай на вопросы пользователя по бюджету, долгам, тратам, оптимизации и личным финансам. " +
        "Опирайся на реальные данные группы (ниже). Отвечай на русском, кратко и по делу, в Markdown. " +
        "Если вопрос не про финансы — вежливо верни к теме. Не выдумывай цифры — используй данные или слово «примерно».",
    },
    {
      role: "user" as const,
      content: `Данные группы:\n${summary}\n\nВопрос пользователя: ${question}`,
    },
  ];
  return runChat(
    messages,
    "⚠️ Не удалось получить ответ. Попробуйте переформулировать вопрос.",
  );
}

// --- internals ---

async function runChat(
  messages: { role: "assistant" | "user"; content: string }[],
  fallback: string,
): Promise<string> {
  // Prefer Groq on localhost (if GROQ_API_KEY is set) — it's public and fast.
  if (preferGroq()) {
    try {
      const content = await groqChat(messages as GroqMessage[], {
        maxTokens: 2048,
        temperature: 0.7,
      });
      const trimmed = content.trim();
      if (!trimmed) throw new Error("Пустой ответ модели");
      return trimmed;
    } catch (err) {
      console.error("[ai] Groq call failed, trying z-ai:", err);
      // fall through to z-ai
    }
  }

  // Fallback / preview path: z-ai-web-dev-sdk (works in sandbox).
  try {
    const zai = await getZai();
    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: "disabled" },
    });
    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) throw new Error("Пустой ответ модели");
    return content;
  } catch (err) {
    console.error("[ai] LLM call failed, using fallback:", err);
    return fallback;
  }
}

function fallbackOptimization(ctx: HouseholdContext): string {
  const cats = byCategory(ctx.expenses);
  const top = cats[0];
  const lines = [
    "### Оптимизация трат (резервный анализ)",
    "",
    top
      ? `- Самая большая категория — **${categoryLabel(ctx, top.category)}** (${top.amount} ${ctx.currency}). Стоит начать с неё.`
      : "- Пока недостаточно данных для анализа.",
    `- Оптовые закупки продуктов раз в неделю могут сэкономить **до 15%** на категории «Продукты».`,
    `- Объедините подписки на стриминг/сервисы — экономия **до 30%** против индивидуальных.`,
    `- Проверьте коммуналку: счётчики и энергосберегающие лампы снижают счёт **до 10–12%**.`,
    "",
    `_Итог: потенциальная экономия до 10–15% от текущих трат._`,
  ];
  return lines.join("\n");
}

function fallbackReminders(ctx: HouseholdContext): string {
  const debts = ctx.balances.debts;
  if (debts.length === 0) return "✅ Все в расчёте — долгов нет. Можно расслабиться! 🎉";
  return [
    "### Вежливые напоминания",
    "",
    ...debts.map(
      (d) =>
        `- **${d.fromName}**, привет! По общим расходам за этот период осталась небольшая сумма — ${d.amount} ${ctx.currency} в пользу **${d.toName}**. Удобно вернуть на днях? 🙂`,
    ),
  ].join("\n");
}

function fallbackForecast(
  spent: number,
  projected: number,
  budget: number | null,
  currency: string,
): string {
  if (budget === null) {
    return [
      "### Прогноз бюджета",
      "",
      `- Бюджет не задан. Текущий расход в месяц: ~${projected} ${currency}.`,
      `- Задайте месячный бюджет командой /budget, чтобы получить точный прогноз.`,
      "",
      "⚠️ Уровень риска: неизвестен",
    ].join("\n");
  }
  const remaining = budget - spent;
  const pct = (spent / budget) * 100;
  const daysLeft =
    new Date().getDate() > 0
      ? Math.floor(remaining / (spent / new Date().getDate() || 1))
      : 0;
  const risk = pct >= 80 ? "высокий" : pct >= 60 ? "средний" : "низкий";
  return [
    "### Прогноз бюджета",
    "",
    `- Израсходовано ${pct.toFixed(0)}% бюджета (${spent} из ${budget} ${currency}).`,
    `- При текущем темпе деньги закончатся примерно через ${daysLeft} дн.`,
    `- Совет: снизьте траты в крупнейшей категории на 10%.`,
    "",
    `⚠️ Уровень риска: ${risk}`,
  ].join("\n");
}

