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
}

export interface HistoryState {
  items: Record<string, HistoryEntry>;
  markWatched: (entry: Omit<HistoryEntry, "watchedAt">) => void;
  clear: () => void;
  _hasHydrated: boolean;
  _setHydrated: (value: boolean) => void;
}

export function historyId(source: string, episodeId: string) {
  return `${source}:${episodeId}`;
}

export const useHistory = create<HistoryState>()(
  persist(
    (set) => ({
      items: {},
      markWatched: (entry) =>
        set((state) =>
          state.items[entry.id]
            ? state
            : { items: { ...state.items, [entry.id]: { ...entry, watchedAt: Date.now() } } },
        ),
      clear: () => set({ items: {} }),
      _hasHydrated: false,
      _setHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: "zxlix-history",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        state?._setHydrated(true);
      },
    },
  ),
);
