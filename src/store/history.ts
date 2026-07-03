import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// Tracks which episodes (by their stable watch id) the user has opened.
// id format is caller-defined; we recommend `${source}:${episodeId}`.
export interface HistoryEntry {
  id: string;
  source: string;
  series?: string;
  title?: string;
  poster?: string;
  episode?: string;
  watchedAt: number;
  /** Last playback position in seconds (native/HLS players only). */
  progressSec?: number;
  /** Total duration in seconds when known. */
  durationSec?: number;
}

export interface HistoryState {
  items: Record<string, HistoryEntry>;
  markWatched: (entry: Omit<HistoryEntry, "watchedAt">) => void;
  updateProgress: (id: string, progressSec: number, durationSec?: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  importItems: (items: Record<string, HistoryEntry>) => void;
  _hasHydrated: boolean;
  _setHydrated: (value: boolean) => void;
}

export function historyId(source: string, episodeId: string) {
  return `${source}:${episodeId}`;
}

/** Percentage 0..100 for progress bars; undefined when not enough data. */
export function progressPercent(entry?: Pick<HistoryEntry, "progressSec" | "durationSec">) {
  if (!entry?.progressSec || !entry.durationSec || entry.durationSec < 30) return undefined;
  return Math.min(100, Math.round((entry.progressSec / entry.durationSec) * 100));
}

export function formatRemaining(entry?: Pick<HistoryEntry, "progressSec" | "durationSec">) {
  if (!entry?.progressSec || !entry.durationSec) return undefined;
  const left = Math.max(0, entry.durationSec - entry.progressSec);
  if (left < 60) return "hampir selesai";
  return `${Math.round(left / 60)} mnt tersisa`;
}

export const useHistory = create<HistoryState>()(
  persist(
    (set) => ({
      items: {},
      markWatched: (entry) =>
        set((state) => {
          const existing = state.items[entry.id];
          // Refresh watchedAt so "continue watching" sorts by last opened,
          // but keep saved progress when re-opening the same episode.
          return { items: { ...state.items, [entry.id]: { ...existing, ...entry, watchedAt: Date.now() } } };
        }),
      updateProgress: (id, progressSec, durationSec) =>
        set((state) => {
          const existing = state.items[id];
          if (!existing) return state;
          return { items: { ...state.items, [id]: { ...existing, progressSec, durationSec: durationSec ?? existing.durationSec, watchedAt: Date.now() } } };
        }),
      remove: (id) =>
        set((state) => {
          if (!state.items[id]) return state;
          const items = { ...state.items };
          delete items[id];
          return { items };
        }),
      clear: () => set({ items: {} }),
      importItems: (items) =>
        set((state) => ({ items: { ...items, ...state.items } })),
      _hasHydrated: false,
      _setHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: "zxlix-history",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      migrate: (persisted) => persisted as { items: Record<string, HistoryEntry> },
      onRehydrateStorage: () => (state) => {
        state?._setHydrated(true);
      },
    },
  ),
);
