"use client";

import Link from "next/link";
import { History, Play, X } from "lucide-react";
import { useHistory, progressPercent, formatRemaining } from "@/store/history";
import { useHydrated } from "@/store/use-hydrated";
import { PosterImage } from "@/components/poster-image";

// Horizontal "continue watching" rail backed by the local history store.
// Renders nothing on the server / before hydration to avoid mismatch.
export function ContinueWatching() {
  const hydrated = useHydrated();
  const items = useHistory((state) => state.items);
  const clear = useHistory((state) => state.clear);
  const remove = useHistory((state) => state.remove);

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
          const percent = progressPercent(entry);
          const remaining = formatRemaining(entry);
          return (
            <div key={entry.id} className="group relative w-64 shrink-0 snap-start">
              <Link
                href={href}
                className="relative flex items-stretch gap-0 overflow-hidden rounded-2xl border border-sky-300/15 bg-[#050b14]/85 transition hover:-translate-y-1 hover:border-sky-300/40"
              >
                <div className="relative h-24 w-[4.5rem] shrink-0 overflow-hidden bg-slate-950">
                  {entry.poster ? (
                    <PosterImage src={entry.poster} alt={entry.title ?? "Poster"} className="size-full object-cover" />
                  ) : (
                    <span className="grid size-full place-items-center bg-sky-500/15 text-sky-300"><Play className="size-6 fill-sky-300" /></span>
                  )}
                  <span className="absolute inset-0 grid place-items-center bg-black/35 opacity-0 transition group-hover:opacity-100"><Play className="size-6 fill-white text-white drop-shadow" /></span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2">
                  <p className="truncate text-sm font-bold text-white group-hover:text-sky-300">{entry.title ?? "Episode"}</p>
                  {entry.episode ? <p className="mt-0.5 text-xs text-white/45">Episode {entry.episode}</p> : null}
                  {remaining ? <p className="mt-0.5 text-[11px] font-bold text-sky-300/80">{remaining}</p> : null}
                  {percent !== undefined ? (
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-sky-400" style={{ width: `${percent}%` }} />
                    </div>
                  ) : null}
                </div>
              </Link>
              <button
                type="button"
                aria-label="Hapus dari riwayat"
                onClick={() => remove(entry.id)}
                className="absolute -right-1.5 -top-1.5 z-10 grid size-6 place-items-center rounded-full border border-white/15 bg-[#050b14] text-white/50 opacity-0 shadow transition group-hover:opacity-100 hover:border-rose-400/50 hover:text-rose-300"
              ><X className="size-3" /></button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
