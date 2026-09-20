// localStorage-based article history management

import type { ArticleRecord } from "./types";
import { STORAGE_KEYS } from "./types";

const MAX_HISTORY_ITEMS = 50;

export function getHistory(): ArticleRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveToHistory(record: ArticleRecord): void {
  const history = getHistory();
  // Remove any existing record with same id
  const filtered = history.filter(h => h.id !== record.id);
  // Add new record to front
  filtered.unshift(record);
  // Trim to max items
  const trimmed = filtered.slice(0, MAX_HISTORY_ITEMS);
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(trimmed));
}

export function deleteFromHistory(id: string): void {
  const history = getHistory();
  const filtered = history.filter(h => h.id !== id);
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(filtered));
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEYS.HISTORY);
}

export function getHistoryItem(id: string): ArticleRecord | undefined {
  const history = getHistory();
  return history.find(h => h.id === id);
}

export function getSettings() {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function saveSettings(settings: any): void {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

export function generateId(): string {
  return `cb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}
