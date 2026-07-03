import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { DisplayCard } from "@/components/anime-card";

// Stable identity for a card across the multiple scraper sources.
// Cards may lack animeId/slug/episodeId, so fall back through the chain.
export function bookmarkKey(card: Pick<DisplayCard, "source" | "animeId" | "slug" | "episodeId" | "title">) {
  const id = card.animeId ?? card.slug ?? card.episodeId ?? card.title;
  return `${card.source ?? "all"}:${id}`;
}

export interface BookmarkState {
  items: Record<string, DisplayCard>;
  add: (card: DisplayCard) => void;
  remove: (key: string) => void;
  toggle: (card: DisplayCard) => void;
  clear: () => void;
  importItems: (items: Record<string, DisplayCard>) => void;
  _hasHydrated: boolean;
  _setHydrated: (value: boolean) => void;
}

export const useBookmarks = create<BookmarkState>()(
  persist(
    (set, get) => ({
      items: {},
      add: (card) => set((state) => ({ items: { ...state.items, [bookmarkKey(card)]: { ...card, savedAt: Date.now() } as DisplayCard } })),
      remove: (key) =>
        set((state) => {
          const next = { ...state.items };
          delete next[key];
          return { items: next };
        }),
      toggle: (card) => {
        const key = bookmarkKey(card);
        if (get().items[key]) get().remove(key);
        else get().add(card);
      },
      clear: () => set({ items: {} }),
      importItems: (items) => set((state) => ({ items: { ...items, ...state.items } })),
      _hasHydrated: false,
      _setHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: "zxlix-bookmarks",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        state?._setHydrated(true);
      },
    },
  ),
);
