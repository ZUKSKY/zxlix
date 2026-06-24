"use client";

import Link from "next/link";
import { History, Play, X } from "lucide-react";
import { useHistory } from "@/store/history";
import { useHydrated } from "@/store/use-hydrated";

// Horizontal "continue watching" rail backed by the local history store.
// Renders nothing on the server / before hydration to avoid mismatch.
export function ContinueWatching() {
  const hydrated = useHydrated();
  const items = useHistory((state) => state.items);
  const clear = useHistory((state) => state.clear);

  if (!hydrated) return null;

  const entries = Object.values(items)
    .sort((a, b) => (b.watchedAt ?? 0) - (a.watchedAt ?? 0))
    .slice(0, 12);

  if (entries.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-5 sm:py-10">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <History className="size-5 text-sky-300" />
          <div>
            <p className="text-[11px] font-black uppercase tracking-[.28em] text-sky-300">Riwayat</p>
            <h2 className="text-2xl font-black text-white md:text-3xl">Lanjut Nonton</h2>
          </div>
        </div>
        <button
          type="button"
          onClick={() => clear()}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-xs font-bold text-white/60 transition-colors hover:border-rose-400/40 hover:text-rose-300"
        >
          <X className="size-3.5" />Bersihkan
        </button>
      </div>

      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:gap-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {entries.map((entry) => {
          const href = entry.series
            ? `/s/${entry.source}/watch/${encodeURIComponent(entry.id.replace(`${entry.source}:`, ""))}?series=${encodeURIComponent(entry.series)}${entry.episode ? `&episode=${encodeURIComponent(entry.episode)}` : ""}`
            : `/s/${entry.source}/watch/${encodeURIComponent(entry.id.replace(`${entry.source}:`, ""))}`;
          return (
            <Link
              key={entry.id}
              href={href}
              className="group relative flex w-56 shrink-0 snap-start items-center gap-3 overflow-hidden rounded-2xl border border-sky-300/15 bg-[#050b14]/85 p-3 transition hover:-translate-y-1 hover:border-sky-300/40"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-sky-500/90 text-white shadow-[0_4px_14px_rgba(56,189,248,.35)]">
                <Play className="size-5 fill-white" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white group-hover:text-sky-300">{entry.title ?? "Episode"}</p>
                {entry.episode ? <p className="mt-0.5 text-xs text-white/45">Episode {entry.episode}</p> : null}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
