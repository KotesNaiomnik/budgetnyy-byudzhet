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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAiConfig, useUpdateAiConfig } from "./hooks";
import { toast } from "sonner";
import { Sparkles, Copy, Check, AlertTriangle } from "lucide-react";

export interface AiConfigDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function AiConfigDialog({ open, onOpenChange }: AiConfigDialogProps) {
  const aiConfig = useAiConfig();
  const updateMut = useUpdateAiConfig();
  const [configText, setConfigText] = React.useState("");
  const [copiedPreview, setCopiedPreview] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setConfigText("");
      aiConfig.refetch();
    }
  }, [open, aiConfig]);

  // The preview-config command that users run in the preview terminal.
  const PREVIEW_COMMAND = "cat /home/z/my-project/.z-ai-config";

  async function handleCopyCommand() {
    try {
      await navigator.clipboard.writeText(PREVIEW_COMMAND);
      setCopiedPreview(true);
      setTimeout(() => setCopiedPreview(false), 1500);
      toast.success("Команда скопирована");
    } catch {
      /* ignore */
    }
  }

  async function handleSave() {
    const trimmed = configText.trim();
    if (!trimmed) {
      toast.error("Вставьте конфигурацию");
      return;
    }
    try {
      await updateMut.mutateAsync(trimmed);
      toast.success("AI-токен обновлён. AI-функции снова работают.");
      onOpenChange(false);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Не удалось сохранить конфигурацию",
      );
    }
  }

  const hasConfig = aiConfig.data?.hasConfig;
  const tokenPreview = aiConfig.data?.tokenPreview;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            AI-токен Z.ai
          </DialogTitle>
          <DialogDescription>
            На localhost AI-функции используют сессионный токен Z.ai, который
            нужно периодически обновлять из превью.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Current status */}
          <div className="rounded-lg border bg-muted/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Текущий токен:</span>
              {hasConfig ? (
                <Badge variant="secondary" className="gap-1">
                  <Check className="size-3 text-emerald-600" />
                  настроен
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="size-3" />
                  отсутствует
                </Badge>
              )}
            </div>
            {tokenPreview ? (
              <p className="mt-1.5 font-mono text-[11px] text-muted-foreground break-all">
                {tokenPreview}
              </p>
            ) : null}
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Как обновить:</p>
            <ol className="space-y-2 text-xs text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-medium text-foreground">1.</span>
                <span>
                  Откройте превью (панель справа) и выполните в терминале песочницы команду:
                </span>
              </li>
            </ol>
            <div className="flex items-center gap-2 rounded-md border bg-background p-2">
              <code className="flex-1 font-mono text-[11px] break-all">
                {PREVIEW_COMMAND}
              </code>
              <Button
                size="sm"
                variant="ghost"
                className="size-7 p-0"
                onClick={handleCopyCommand}
                title="Скопировать команду"
              >
                {copiedPreview ? (
                  <Check className="size-3.5 text-emerald-600" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </Button>
            </div>
            <ol className="space-y-2 text-xs text-muted-foreground" start={2}>
              <li className="flex gap-2">
                <span className="font-medium text-foreground">2.</span>
                <span>Скопируйте весь вывод (JSON-строка с baseUrl, apiKey, token)</span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-foreground">3.</span>
                <span>Вставьте его ниже и нажмите «Сохранить»</span>
              </li>
            </ol>
          </div>

          {/* Textarea for config */}
          <div className="space-y-1.5">
            <Label htmlFor="ai-config-text">Конфигурация Z.ai</Label>
            <Textarea
              id="ai-config-text"
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
              placeholder='{"baseUrl":"https://internal-api.z.ai/v1","apiKey":"Z.ai","token":"eyJ...","chatId":"...","userId":"..."}'
              className="font-mono text-[11px] min-h-[100px] resize-y"
            />
          </div>

          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="inline size-3.5 mr-1" />
            Токен работает, пока активна сессия Z.ai. Если AI снова перестал отвечать — повторите шаги.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMut.isPending || !configText.trim()}
          >
            {updateMut.isPending ? "Сохранение…" : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
