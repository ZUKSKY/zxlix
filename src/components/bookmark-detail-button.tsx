"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useBookmarks, bookmarkKey } from "@/store/bookmarks";
import { useHydrated } from "@/store/use-hydrated";
import type { DisplayCard } from "@/components/anime-card";

// Larger labelled bookmark toggle for detail pages (sits next to the watch CTA).
export function BookmarkDetailButton({ card }: { card: DisplayCard }) {
  const hydrated = useHydrated();
  const toggle = useBookmarks((state) => state.toggle);
  const saved = useBookmarks((state) => hydrated && !!state.items[bookmarkKey(card)]);

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={() => toggle(card)}
      aria-pressed={saved}
      className={`mt-6 ml-0 inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-black transition hover:-translate-y-0.5 sm:ml-3 ${
        saved
          ? "border-sky-400/40 bg-sky-500/90 text-white shadow-[0_4px_14px_rgba(56,189,248,.35)] hover:bg-sky-500"
          : "border-sky-300/20 bg-sky-300/10 text-sky-100 hover:bg-sky-300/18"
      }`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {saved ? (
          <motion.span key="s" initial={{ scale: 0, rotate: -25 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 18 }}>
            <BookmarkCheck className="size-4" />
          </motion.span>
        ) : (
          <motion.span key="i" initial={{ scale: 0.6 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
            <Bookmark className="size-4" />
          </motion.span>
        )}
      </AnimatePresence>
      {saved ? "Tersimpan" : "Simpan"}
    </motion.button>
  );
}
