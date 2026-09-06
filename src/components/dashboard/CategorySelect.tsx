"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { CATEGORY_LIST, type CategoryDef } from "@/lib/categories";
import { useCustomCategories } from "./useCustomCategories";

const BUILTIN_EMOJIS: Record<string, string> = {
  "Продукты": "🛒", "Коммуналка": "💡", "Транспорт": "🚕", "Рестораны": "🍽️",
  "Бытовые товары": "🧹", "Развлечения": "🎬", "Здоровье": "💊", "Красота": "💇",
  "Одежда": "👕", "Спорт": "⚽", "Дети": "🧸", "Путешествия": "✈️",
  "Электроника": "📱", "Прочее": "📌",
};

const EMOJI_CHOICES = [
  "🛒", "💡", "🚕", "🍽️", "🧹", "🎬", "💊", "💇", "👕", "⚽",
  "🧸", "✈️", "📱", "📌", "🎁", "🐾", "📚", "🏛️", "✏️", "🔨",
  "🏠", "☕", "🍺", "🍷", "🍕", "🍔", "🍣", "🍰", "🎯", "🎮",
  "🎵", "🎤", "🎸", "📷", "🖥️", "⌚", "🔑", "💰", "💳", "💸",
  "🛍️", "📦", "📮", "📊", "📈", "📉", "🗓️", "⏰", "🔔", "📍",
  "🚗", "🚌", "🚂", "⛽", "🅿️", "🛠️", "🔧", "🎨", "🧩", "🎲",
  "🏆", "🥇", "🥈", "🥉", "🏅", "🤝", "❤️", "👍", "✨", "🔥",
];

const CUSTOM_VALUE_PREFIX = "__custom__:";

export interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
}

export function CategorySelect({ value, onChange, id }: CategorySelectProps) {
  const { categories, addCategory, updateCategory, removeCategory } = useCustomCategories();
  const [showNew, setShowNew] = React.useState(false);
  const [newLabel, setNewLabel] = React.useState("");
  const [newEmoji, setNewEmoji] = React.useState("📌");
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
  const [editingLabel, setEditingLabel] = React.useState<string | null>(null);
  const [editLabel, setEditLabel] = React.useState("");
  const [editEmoji, setEditEmoji] = React.useState("");
  const [showEditEmojiPicker, setShowEditEmojiPicker] = React.useState(false);

  function handleAdd() {
    if (!newLabel.trim()) return;
    addCategory(newLabel.trim(), newEmoji);
    onChange(newLabel.trim());
    setNewLabel("");
    setNewEmoji("📌");
    setShowNew(false);
    setShowEmojiPicker(false);
  }

  function startEdit(label: string, emoji: string) {
    setEditingLabel(label);
    setEditLabel(label);
    setEditEmoji(emoji);
  }

  function saveEdit() {
    if (!editingLabel || !editLabel.trim()) return;
    updateCategory(editingLabel, editLabel.trim(), editEmoji);
    if (value === editingLabel) onChange(editLabel.trim());
    setEditingLabel(null);
    setShowEditEmojiPicker(false);
  }

  const isCustom = categories.some((c) => c.label === value);

  return (
    <div className="space-y-2">
      <Select
        value={isCustom ? `${CUSTOM_VALUE_PREFIX}${value}` : value}
        onValueChange={(v) => {
          if (v === "__new__") {
            setShowNew(true);
          } else if (v.startsWith(CUSTOM_VALUE_PREFIX)) {
            onChange(v.slice(CUSTOM_VALUE_PREFIX.length));
          } else {
            onChange(v);
          }
        }}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CATEGORY_LIST.map((c: CategoryDef) => (
            <SelectItem key={c.key} value={c.key}>
              <span className="flex items-center gap-2">
                <span>{BUILTIN_EMOJIS[c.label] ?? "📌"}</span>
                {c.label}
              </span>
            </SelectItem>
          ))}
          {categories.length > 0 ? (
            <SelectItem value="__separator__" disabled>
              ─── Свои категории ───
            </SelectItem>
          ) : null}
          {categories.map((c) => (
            <SelectItem key={c.label} value={`${CUSTOM_VALUE_PREFIX}${c.label}`}>
              <span className="flex items-center gap-2">
                <span>{c.emoji}</span>
                {c.label}
              </span>
            </SelectItem>
          ))}
          <SelectItem value="__new__">
            <span className="flex items-center gap-2 text-primary">
              <Plus className="size-3.5" />
              Новая категория…
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* New category input */}
      {showNew ? (
        <div className="flex items-center gap-2 rounded-md border p-2">
          {/* Emoji picker button */}
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-12 text-lg p-0"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                {newEmoji}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
              <div className="grid grid-cols-8 gap-1">
                {EMOJI_CHOICES.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="flex size-7 items-center justify-center rounded text-lg hover:bg-accent"
                    onClick={() => {
                      setNewEmoji(emoji);
                      setShowEmojiPicker(false);
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Название категории"
            maxLength={40}
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            autoFocus
          />
          <Button size="icon" className="size-8" onClick={handleAdd} disabled={!newLabel.trim()}>
            <Check className="size-4" />
          </Button>
          <Button size="icon" variant="outline" className="size-8" onClick={() => setShowNew(false)}>
            <X className="size-4" />
          </Button>
        </div>
      ) : null}

      {/* Edit/delete custom categories */}
      {categories.length > 0 ? (
        <div className="space-y-1 rounded-md border p-2">
          <p className="text-xs text-muted-foreground">Свои категории:</p>
          {categories.map((c) => (
            <div key={c.label} className="flex items-center gap-2">
              {editingLabel === c.label ? (
                <>
                  <Popover open={showEditEmojiPicker} onOpenChange={setShowEditEmojiPicker}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 w-10 text-lg p-0">
                        {editEmoji}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2" align="start">
                      <div className="grid grid-cols-8 gap-1">
                        {EMOJI_CHOICES.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            className="flex size-7 items-center justify-center rounded text-lg hover:bg-accent"
                            onClick={() => {
                              setEditEmoji(emoji);
                              setShowEditEmojiPicker(false);
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="flex-1"
                    maxLength={40}
                  />
                  <Button size="icon" className="size-7" onClick={saveEdit}>
                    <Check className="size-3.5" />
                  </Button>
                  <Button size="icon" variant="outline" className="size-7" onClick={() => setEditingLabel(null)}>
                    <X className="size-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-sm">{c.emoji}</span>
                  <span className="flex-1 text-sm">{c.label}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-muted-foreground"
                    onClick={() => startEdit(c.label, c.emoji)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeCategory(c.label)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
