"use client";

import * as React from "react";

const STORAGE_KEY = "budgetnyy-budget.customCategories";

export interface CustomCategory {
  label: string;
  emoji: string;
}

const DEFAULT_EMOJI = "📌";

export function useCustomCategories() {
  const [categories, setCategories] = React.useState<CustomCategory[]>([]);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCategories(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const persist = (cats: CustomCategory[]) => {
    setCategories(cats);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cats));
    } catch { /* ignore */ }
  };

  const addCategory = (label: string, emoji?: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    // Avoid duplicates (case-insensitive).
    if (categories.some((c) => c.label.toLowerCase() === trimmed.toLowerCase())) return;
    persist([...categories, { label: trimmed, emoji: emoji || DEFAULT_EMOJI }]);
  };

  const updateCategory = (oldLabel: string, newLabel: string, emoji?: string) => {
    persist(
      categories.map((c) =>
        c.label === oldLabel
          ? { label: newLabel.trim() || c.label, emoji: emoji || c.emoji }
          : c,
      ),
    );
  };

  const removeCategory = (label: string) => {
    persist(categories.filter((c) => c.label !== label));
  };

  return { categories, addCategory, updateCategory, removeCategory };
}
