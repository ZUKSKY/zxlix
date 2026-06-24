"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Bookmark, Compass, Trash2 } from "lucide-react";
import { AnimeCardView } from "@/components/anime-card";
import { useBookmarks } from "@/store/bookmarks";
import { useHydrated } from "@/store/use-hydrated";

export function BookmarksList() {
  const hydrated = useHydrated();
  const items = useBookmarks((state) => state.items);
  const clear = useBookmarks((state) => state.clear);

  // First client render must match the server (empty) markup.
  if (!hydrated) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="aspect-[2/3] animate-pulse rounded-[1.15rem] border border-sky-300/10 bg-white/[.04] sm:rounded-[1.35rem]" />
          ))}
        </div>
      </section>
    );
  }

  const cards = Object.values(items).sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));

  if (cards.length === 0) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-auto flex min-h-[55vh] max-w-7xl flex-col items-center justify-center px-4 text-center"
      >
        <div className="mb-5 grid h-20 w-20 place-items-center rounded-full border border-sky-300/15 bg-[#050b14]/85 shadow-[0_18px_50px_rgba(0,0,0,.32)]">
          <Bookmark className="h-9 w-9 text-sky-400/70" />
        </div>
        <h1 className="text-lg font-bold text-sky-50 sm:text-xl">Belum ada bookmark</h1>
        <p className="mt-1.5 max-w-xs text-sm text-sky-100/60">Simpan anime favoritmu buat ditonton nanti.</p>
        <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-full border border-sky-400/40 bg-sky-500/90 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(56,189,248,.35)] transition-colors hover:bg-sky-500">
          <Compass className="h-4 w-4" />Jelajah anime
        </Link>
      </motion.section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-5 sm:py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-sky-50 sm:text-2xl">Bookmark</h1>
          <span className="rounded-full border border-sky-300/15 bg-sky-500/10 px-2.5 py-0.5 text-xs font-bold text-sky-300">{cards.length}</span>
        </div>
        <button
          type="button"
          onClick={() => clear()}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-xs font-bold text-white/60 transition-colors hover:border-rose-400/40 hover:text-rose-300"
        >
          <Trash2 className="h-3.5 w-3.5" />Hapus semua
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
        {cards.map((card) => (
          <AnimeCardView key={`${card.source}-${card.title}-${card.savedAt}`} card={card} />
        ))}
      </div>
    </section>
  );
}
