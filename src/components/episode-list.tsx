"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ChevronDown, Play, Search } from "lucide-react";
import { useHistory, historyId } from "@/store/history";
import { useHydrated } from "@/store/use-hydrated";

export interface EpisodeItem {
  id: string;
  href: string;
  // The episode's stable watch id, in the same form MarkWatched stores it
  // (decodeURIComponent of the [episodeId] route segment).
  watchEpisodeId: string;
  title: string;
  sub?: string;
}

const PAGE = 24;

export function EpisodeList({ source, episodes }: { source: string; episodes: EpisodeItem[] }) {
  const hydrated = useHydrated();
  const items = useHistory((state) => state.items);
  const [shown, setShown] = useState(PAGE);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return episodes;
    return episodes.filter((ep) => ep.title.toLowerCase().includes(q));
  }, [episodes, query]);

  const visible = filtered.slice(0, shown);
  const remaining = filtered.length - visible.length;

  const watched = (watchEpisodeId: string) => hydrated && !!items[historyId(source, watchEpisodeId)];

  if (!episodes.length) return null;

  return (
    <div className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black text-white">Daftar Episode <span className="text-sm font-bold text-white/40">({episodes.length})</span></h2>
        {episodes.length > 12 ? (
          <label className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-sm text-white/70 focus-within:border-sky-300/40">
            <Search className="size-4 text-sky-300/70" />
            <input
              value={query}
              onChange={(event) => { setQuery(event.target.value); setShown(PAGE); }}
              placeholder="Cari episode"
              className="w-28 bg-transparent text-sm text-white outline-none placeholder:text-white/35 sm:w-40"
            />
          </label>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((ep) => {
          const seen = watched(ep.watchEpisodeId);
          return (
            <Link
              key={ep.id}
              href={ep.href}
              className={`group relative flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition hover:-translate-y-1 ${
                seen
                  ? "border-sky-300/40 bg-sky-500/[.08] hover:border-sky-300/60"
                  : "glass-card hover:border-sky-300/40"
              }`}
            >
              <div className="min-w-0">
                <p className={`truncate font-bold ${seen ? "text-sky-100" : "text-white"}`}>{ep.title}</p>
                {ep.sub ? <p className="mt-1 truncate text-xs text-white/45">{ep.sub}</p> : null}
              </div>
              {seen ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-sky-300/40 bg-sky-500/90 px-2 py-1 text-[10px] font-black text-white">
                  <Check className="size-3" />Ditonton
                </span>
              ) : (
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/[.06] text-sky-300/70 transition group-hover:bg-sky-500/20 group-hover:text-sky-200">
                  <Play className="size-3.5" />
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 ? <p className="mt-4 text-sm text-white/45">Episode tidak ditemukan.</p> : null}

      {remaining > 0 ? (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={() => setShown((value) => value + PAGE)}
            className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-400/10 px-5 py-2.5 text-sm font-black text-sky-100 transition hover:bg-sky-400/18"
          >
            Tampilkan {Math.min(PAGE, remaining)} lagi
            <ChevronDown className="size-4" />
            <span className="text-xs font-bold text-sky-200/60">sisa {remaining}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
