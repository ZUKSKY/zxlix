"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useBookmarks, bookmarkKey } from "@/store/bookmarks";
import { useHydrated } from "@/store/use-hydrated";
import type { DisplayCard } from "@/components/anime-card";

export function BookmarkButton({ card }: { card: DisplayCard }) {
  const hydrated = useHydrated();
  const toggle = useBookmarks((state) => state.toggle);
  const saved = useBookmarks((state) => hydrated && !!state.items[bookmarkKey(card)]);

  const base = "absolute bottom-2 right-2 z-20 grid h-9 w-9 place-items-center rounded-full border backdrop-blur transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 sm:bottom-3 sm:right-3";
  const idle = "border-white/10 bg-black/60 text-sky-100 hover:bg-black/80 hover:border-sky-300/40 hover:text-sky-300 opacity-0 group-hover:opacity-100 max-md:opacity-100";
  const active = "border-sky-400/40 bg-sky-500/90 text-white shadow-[0_4px_14px_rgba(56,189,248,.35)] hover:bg-sky-500 opacity-100";

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.82 }}
      whileHover={{ scale: 1.08 }}
      transition={{ type: "spring", stiffness: 420, damping: 16 }}
      aria-label={saved ? "Hapus dari bookmark" : "Simpan ke bookmark"}
      aria-pressed={saved}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle(card);
      }}
      className={`${base} ${saved ? active : idle}`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {saved ? (
          <motion.span
            key="saved"
            initial={{ scale: 0, rotate: -25, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
          >
            <BookmarkCheck className="size-4" />
          </motion.span>
        ) : (
          <motion.span key="idle" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}>
            <Bookmark className="size-4" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
