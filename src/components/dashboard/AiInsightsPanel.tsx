"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, RefreshCw, MessageCircleQuestion, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";
import {
  useAiInsights,
  useAskAi,
  useGenerateAi,
  type AiInsightType,
} from "./hooks";

export interface AiInsightsPanelProps {
  householdId: string | null;
}

const TABS: { key: AiInsightType; label: string; hint: string }[] = [
  { key: "optimization", label: "Оптимизация", hint: "Где можно сэкономить" },
  { key: "reminders", label: "Напоминания", hint: "Мягкие напоминания о долгах" },
  { key: "forecast", label: "Прогноз", hint: "Когда закончится бюджет" },
];

export function AiInsightsPanel({ householdId }: AiInsightsPanelProps) {
  const { toast } = useToast();
  const insightsQuery = useAiInsights(householdId);
  const generate = useGenerateAi(householdId);
  const askAi = useAskAi(householdId);
  const [activeTab, setActiveTab] = React.useState<AiInsightType | "question">("optimization");
  const [pendingAll, setPendingAll] = React.useState(false);
  // Local cache so the new content shows immediately after generation.
  const [localCache, setLocalCache] = React.useState<
    Record<AiInsightType, { content: string; createdAt: string } | null>
  >({ optimization: null, reminders: null, forecast: null });

  // Q&A state.
  const [question, setQuestion] = React.useState("");
  const [qaHistory, setQaHistory] = React.useState<{ q: string; a: string; at: string }[]>([]);

  // Sync server insights into local cache when they arrive.
  React.useEffect(() => {
    if (!insightsQuery.data) return;
    setLocalCache((prev) => {
      const next = { ...prev };
      for (const t of TABS) {
        const fresh = insightsQuery.data!.find((i) => i.type === t.key);
        if (fresh) next[t.key] = { content: fresh.content, createdAt: fresh.createdAt };
      }
      return next;
    });
  }, [insightsQuery.data]);

  function findInsight(type: AiInsightType) {
    return (
      localCache[type] ??
      insightsQuery.data?.find((i) => i.type === type) ??
      null
    );
  }

  async function runOne(type: AiInsightType) {
    if (!householdId) return;
    try {
      const res = await generate.mutateAsync(type);
      setLocalCache((prev) => ({
        ...prev,
        [type]: { content: res.content, createdAt: res.createdAt },
      }));
      toast({ title: "AI-отчёт готов" });
    } catch (err) {
      toast({
        title: "Не удалось сгенерировать",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  }

  async function runAll() {
    if (!householdId) return;
    setPendingAll(true);
    try {
      for (const t of TABS) {
        const res = await generate.mutateAsync(t.key);
        setLocalCache((prev) => ({
          ...prev,
          [t.key]: { content: res.content, createdAt: res.createdAt },
        }));
      }
      toast({ title: "Все AI-отчёты обновлены" });
    } catch (err) {
      toast({
        title: "Ошибка при обновлении",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setPendingAll(false);
    }
  }

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!householdId) return;
    const q = question.trim();
    if (!q) return;
    try {
      const res = await askAi.mutateAsync(q);
      setQaHistory((prev) => [
        { q, a: res.content, at: res.createdAt },
        ...prev,
      ]);
      setQuestion("");
    } catch (err) {
      toast({
        title: "Не удалось получить ответ",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  }

  const isLoading = generate.isPending || pendingAll;

  return (
    <Card className="py-5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            AI-анализ бюджета
          </span>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={runAll}
            disabled={isLoading || !householdId}
          >
            {pendingAll ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Обновить всё
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AiInsightType | "question")}>
          <TabsList className="w-full">
            {TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="flex-1">
                {t.label}
              </TabsTrigger>
            ))}
            <TabsTrigger value="question" className="flex-1 gap-1">
              <MessageCircleQuestion className="size-3.5" />
              Спросить AI
            </TabsTrigger>
          </TabsList>

          {TABS.map((t) => {
            const insight = findInsight(t.key);
            const isThisLoading = isLoading && activeTab === t.key && pendingAll;
            return (
              <TabsContent key={t.key} value={t.key} className="mt-3">
                <div className="flex items-center justify-between gap-2 pb-3">
                  <p className="text-xs text-muted-foreground">{t.hint}</p>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-1.5"
                    onClick={() => runOne(t.key)}
                    disabled={isLoading || !householdId}
                  >
                    {generate.isPending && generate.variables === t.key ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Sparkles className="size-4" />
                    )}
                    Сгенерировать
                  </Button>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${t.key}-${insight?.createdAt ?? "empty"}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                  >
                    {isThisLoading && !insight ? (
                      <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Генерируем…
                      </div>
                    ) : insight ? (
                      <div className="rounded-md border bg-muted/30 p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <Badge variant="outline" className="font-normal">
                            обновлено{" "}
                            {new Date(insight.createdAt).toLocaleString("ru-RU", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Badge>
                        </div>
                        <div className="ai-prose">
                          <ReactMarkdown>{insight.content}</ReactMarkdown>
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-32 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                        <Sparkles className="size-5 text-muted-foreground/60" />
                        Нажмите «Сгенерировать», чтобы получить отчёт.
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </TabsContent>
            );
          })}

          {/* Q&A tab */}
          <TabsContent value="question" className="mt-3">
            <form onSubmit={handleAsk} className="flex gap-2 pb-3">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Например: кто тратит больше всего и на чём можно сэкономить?"
                maxLength={1000}
                disabled={!householdId || askAi.isPending}
              />
              <Button type="submit" size="sm" disabled={!householdId || askAi.isPending || !question.trim()}>
                {askAi.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                <span className="sr-only">Спросить</span>
              </Button>
            </form>
            {qaHistory.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                <MessageCircleQuestion className="size-5 text-muted-foreground/60" />
                Задайте любой вопрос о бюджете, долгах или тратах.
              </div>
            ) : (
              <ul className="space-y-3">
                {qaHistory.map((qa, i) => (
                  <li key={i} className="rounded-md border bg-muted/30 p-3">
                    <p className="mb-2 text-xs font-medium text-foreground">
                      <span className="text-muted-foreground">Вопрос:</span> {qa.q}
                    </p>
                    <div className="ai-prose text-sm">
                      <ReactMarkdown>{qa.a}</ReactMarkdown>
                    </div>
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      {new Date(qa.at).toLocaleString("ru-RU", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
