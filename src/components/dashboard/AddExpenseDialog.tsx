"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Mic, Camera, FileText, Loader2 } from "lucide-react";
import { CATEGORY_LIST, CATEGORIES, type CategoryDef } from "@/lib/categories";
import { CategorySelect } from "./CategorySelect";
import { useToast } from "@/hooks/use-toast";
import {
  useParseExpenseVoice,
  useParseExpensePhoto,
  useParseExpenseFile,
} from "./hooks";

export interface AddExpenseDialogProps {
  members: { id: string; name: string; username?: string | null }[];
  currency: string;
  displayCurrency?: string;
  dispSymbol?: string;
  dispRate?: number;
  householdId?: string | null;
  onSubmit: (input: {
    amount: number;
    category: string;
    description?: string;
    paidById: string;
    date?: string;
    participantIds?: string[];
  }) => void;
  isSubmitting?: boolean;
}

function todayIso(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 10);
}

export function AddExpenseDialog({
  members,
  currency,
  displayCurrency = "RUB",
  dispSymbol = "₽",
  dispRate = 0,
  householdId = null,
  onSubmit,
  isSubmitting,
}: AddExpenseDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [category, setCategory] = React.useState<string>("products");
  const [description, setDescription] = React.useState("");
  const [paidById, setPaidById] = React.useState("");
  const [date, setDate] = React.useState<string>(todayIso());
  const [participantIds, setParticipantIds] = React.useState<string[]>([]);

  // --- Voice recording ---
  const [isRecording, setIsRecording] = React.useState(false);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);

  // --- AI parse mutations ---
  const parseVoice = useParseExpenseVoice(householdId);
  const parsePhoto = useParseExpensePhoto(householdId);
  const parseFile = useParseExpenseFile(householdId);
  const isParsing = parseVoice.isPending || parsePhoto.isPending || parseFile.isPending;

  React.useEffect(() => {
    if (open && members.length > 0) {
      setPaidById((prev) => prev || members[0].id);
      setParticipantIds((prev) =>
        prev.length === 0 ? members.map((m) => m.id) : prev,
      );
    }
  }, [open, members]);

  function reset() {
    setAmount("");
    setCategory("products");
    setDescription("");
    setPaidById(members[0]?.id ?? "");
    setDate(todayIso());
    setParticipantIds(members.map((m) => m.id));
  }

  function toggleParticipant(id: string) {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  // --- Pre-fill from parsed result ---
  function applyParsedResult(rubAmount: number, cat: string, desc: string, participantNames?: string[]) {
    // Convert RUB → display currency for the amount field
    if (displayCurrency === "RUB" || dispRate <= 0) {
      setAmount(String(rubAmount));
    } else {
      setAmount((rubAmount * dispRate).toFixed(2));
    }
    // Match category by label (case-insensitive) or by chartCategory synonyms
    const catLower = (cat || "").toLowerCase().trim();
    const allCats = Object.values(CATEGORIES);
    let matchedKey = "other";
    // Exact label match
    const exact = allCats.find((c) => c.label.toLowerCase() === catLower);
    if (exact) {
      matchedKey = exact.key;
    } else {
      // Partial match: category label contains the parsed text or vice versa
      const partial = allCats.find(
        (c) => c.key !== "other" && (catLower.includes(c.label.toLowerCase()) || c.label.toLowerCase().includes(catLower)),
      );
      if (partial) matchedKey = partial.key;
    }
    setCategory(matchedKey);
    // Clean description: if it duplicates the category, clear it
    const cleanDesc = (desc || "").trim();
    setDescription(cleanDesc);
    // Match participants by name → if found, set them AND set paidById to first matched
    if (participantNames && participantNames.length > 0) {
      const matchedIds: string[] = [];
      for (const name of participantNames) {
        const m = members.find(
          (mem) => mem.name.toLowerCase() === name.toLowerCase() ||
            mem.name.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(mem.name.toLowerCase()),
        );
        if (m) matchedIds.push(m.id);
      }
      if (matchedIds.length > 0) {
        setParticipantIds(matchedIds);
        // Set paidById to the first matched participant (the one who said they paid)
        setPaidById(matchedIds[0]);
      }
    }
    toast({ title: "Распознано — проверьте и сохраните" });
  }

  // --- Voice recording handlers ---
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(",")[1];
          try {
            const res = await parseVoice.mutateAsync({
              audioBase64: base64,
              members: members.map((m) => ({ name: m.name, username: m.username })),
            });
            applyParsedResult(res.amount, res.category, res.description, res.participantNames);
          } catch (e) {
            toast({ title: "Не удалось распознать голос", variant: "destructive" });
          }
        };
        reader.readAsDataURL(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      toast({ title: "Нет доступа к микрофону", variant: "destructive" });
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }

  // --- Photo handler ---
  const photoInputRef = React.useRef<HTMLInputElement>(null);
  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(",")[1];
      try {
        const res = await parsePhoto.mutateAsync({ imageBase64: base64, mime: file.type });
        applyParsedResult(res.amount, res.category, res.description);
      } catch {
        toast({ title: "Не удалось распознать фото", variant: "destructive" });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  // --- File handler ---
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(",")[1];
      try {
        const res = await parseFile.mutateAsync({ fileBase64: base64, mime: file.type });
        applyParsedResult(res.amount, res.category, res.description);
      } catch {
        toast({ title: "Не удалось распознать файл", variant: "destructive" });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount.replace(",", "."));
    if (!Number.isFinite(amt) || amt <= 0) {
      toast({ title: "Введите корректную сумму", variant: "destructive" });
      return;
    }
    if (!paidById) {
      toast({ title: "Выберите, кто платил", variant: "destructive" });
      return;
    }
    let amountRub: number;
    if (displayCurrency === "RUB" || dispRate <= 0) {
      amountRub = Math.round(amt);
    } else {
      amountRub = Math.round(amt / dispRate);
    }
    onSubmit({
      amount: amountRub,
      category,
      description: description.trim() || undefined,
      paidById,
      date,
      participantIds,
    });
    reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="size-4" />
          Добавить расход
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Новый расход</DialogTitle>
          <DialogDescription>
            Запишите покупку вручную или используйте голос / фото / файл чека.
            После распознавания проверьте данные и сохраните.
          </DialogDescription>
        </DialogHeader>

        {/* AI input buttons */}
        <div className="flex flex-wrap gap-2 border-b pb-3">
          <Button
            type="button"
            size="sm"
            variant={isRecording ? "destructive" : "outline"}
            className="gap-1.5"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isParsing || !householdId}
          >
            {isRecording ? <Loader2 className="size-4 animate-spin" /> : <Mic className="size-4" />}
            {isRecording ? "Остановить" : "Голос"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => photoInputRef.current?.click()}
            disabled={isParsing || !householdId}
          >
            {parsePhoto.isPending ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
            Фото
          </Button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhoto}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => fileInputRef.current?.click()}
            disabled={isParsing || !householdId}
          >
            {parseFile.isPending ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
            Файл
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleFile}
          />
          {parseVoice.isPending ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> Распознаём голос…
            </span>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="exp-amount">Сумма, {dispSymbol}</Label>
              <Input
                id="exp-amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  // Allow digits, comma, dot — no forced decimals.
                  const v = e.target.value.replace(/[^\d.,]/g, "");
                  setAmount(v);
                }}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-date">Дата</Label>
              <Input
                id="exp-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp-category">Категория</Label>
            <CategorySelect value={category} onChange={setCategory} id="exp-category" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp-desc">Описание (необязательно)</Label>
            <Input
              id="exp-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Например, Пятёрочка — еженедельный запас"
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp-paidby">Кто платил</Label>
            <Select value={paidById} onValueChange={setPaidById}>
              <SelectTrigger id="exp-paidby" className="w-full">
                <SelectValue placeholder="Участник" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>С кем поделили</Label>
            <p className="text-xs text-muted-foreground">
              Сумма делится между выбранными участниками (кроме платильщика).
            </p>
            <div className="grid grid-cols-2 gap-2 rounded-md border p-3 sm:grid-cols-3">
              {members.map((m) => {
                const checked = participantIds.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleParticipant(m.id)}
                      aria-label={m.name}
                    />
                    <span className="truncate">{m.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Сохраняем…" : "Добавить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
