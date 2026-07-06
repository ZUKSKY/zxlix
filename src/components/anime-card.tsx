import Link from "next/link";
import { Clock3, PlayCircle, Star } from "lucide-react";
import { PosterImage } from "@/components/poster-image";
import { BookmarkButton } from "@/components/bookmark-button";
import { WatchedBadge } from "@/components/watched-badge";
import { hideSourceText } from "@/lib/sources";

export interface DisplayCard {
  title: string;
  poster?: string;
  banner?: string;
  animeId?: string;
  slug?: string;
  episodeId?: string;
  episode?: string | number;
  type?: string;
  score?: string;
  status?: string;
  badge?: string;
  meta?: string;
  duration?: string;
  genres?: string[];
  playable?: boolean;
  source?: string;
  savedAt?: number;
}

function uniqueBadges(values: Array<string | number | undefined>) {
  const seen = new Set<string>();
  return values
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function episodeBadge(value?: string | number) {
  const text = String(value ?? "").trim();
  if (!text || text === "0") return undefined;
  if (/^(ep|eps|episode)\b/i.test(text)) return text;
  return `Ep ${text}`;
}

function cleanType(value?: string) {
  const text = String(value ?? "").trim();
  if (!text || /^(all|unknown|undefined|null)$/i.test(text)) return undefined;
  return text;
}

function isMovieCard(card: DisplayCard) {
  return /movie|film/i.test(`${card.type ?? ""} ${card.status ?? ""} ${card.badge ?? ""} ${card.meta ?? ""}`);
}

export function AnimeCardView({ card }: { card: DisplayCard }) {
  const slug = card.slug ?? card.animeId ?? "";
  const sourceBase = card.source && card.source !== "metadata" ? `/s/${card.source}` : "";
  const href = card.playable === false
    ? `/search?q=${encodeURIComponent(card.title)}`
    : card.episodeId
      ? `${sourceBase}/watch/${encodeURIComponent(card.episodeId)}?series=${encodeURIComponent(slug)}${isMovieCard(card) ? "&kind=movie" : ""}`
      : `${sourceBase}/anime/${encodeURIComponent(slug)}`;
  const topBadge = hideSourceText(card.badge) ?? hideSourceText(cleanType(card.type));
  const subBadges = uniqueBadges([hideSourceText(card.status), episodeBadge(card.episode), hideSourceText(card.duration), hideSourceText(card.meta)]).slice(0, 2);
  const footerMeta = uniqueBadges([hideSourceText(cleanType(card.type)), ...subBadges]).join(" · ");
  const visibleGenres = (card.genres ?? []).map((genre) => hideSourceText(genre)).filter(Boolean).slice(0, 2);

  return <Link href={href} className="poster-card group relative block overflow-hidden rounded-[1.15rem] border border-sky-300/15 bg-[#050b14] shadow-[0_18px_50px_rgba(0,0,0,.30)] sm:rounded-[1.35rem]">
    <div className="relative aspect-[2/3] overflow-hidden bg-slate-950">
      <PosterImage src={card.poster} sources={[card.banner]} alt={card.title} className="size-full transform-gpu object-cover transition-transform duration-500 ease-out group-hover:scale-[1.035]" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/18 to-transparent opacity-90" />
      <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle,rgba(14,165,233,.28),rgba(2,6,23,.72))] opacity-0 transition-opacity duration-200 group-hover:opacity-100"><span className="grid size-14 place-items-center rounded-full border border-white/20 bg-white/15 text-white shadow-[0_0_42px_rgba(14,165,233,.45)] backdrop-blur"><PlayCircle className="size-9 fill-white/20 drop-shadow-2xl" /></span></div>
      {card.score ? <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/60 px-2 py-1 text-[10px] font-bold text-sky-100 backdrop-blur sm:left-3 sm:top-3 sm:text-xs"><Star className="size-3 fill-sky-300 text-sky-300" />{card.score}</span> : null}
      {topBadge ? <span className="absolute right-2 top-2 max-w-[58%] truncate rounded-full bg-sky-500/90 px-2 py-1 text-[10px] font-bold text-white shadow-lg shadow-sky-500/30 sm:right-3 sm:top-3 sm:text-xs">{topBadge}</span> : null}
      {subBadges.length ? <div className="absolute bottom-12 right-2 flex max-w-[72%] flex-wrap justify-end gap-1 sm:bottom-14 sm:right-3">
        {subBadges.map((badge) => <span key={badge} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/62 px-2 py-1 text-[9px] font-bold text-white/90 backdrop-blur"><Clock3 className="size-3 text-sky-300" />{badge}</span>)}
      </div> : null}

      <BookmarkButton card={card} />
      <WatchedBadge source={card.source} episodeId={card.episodeId} />
    </div>
    <div className="space-y-1 p-2.5 sm:p-3">
      <h3 className="line-clamp-2 text-xs font-bold leading-snug text-white transition group-hover:text-sky-300 sm:text-sm">{card.title}</h3>
      <div className="flex flex-wrap gap-1">
        {visibleGenres.map((genre) => <span key={genre} className="rounded-full bg-sky-400/10 px-2 py-0.5 text-[10px] font-bold text-sky-200/80">{genre}</span>)}
      </div>
      {card.playable === false ? <p className="line-clamp-1 text-[11px] font-bold text-amber-200/70 sm:text-xs">Info · {footerMeta || "stream belum tersedia"}</p> : footerMeta ? <p className="line-clamp-1 text-[11px] text-white/45 sm:text-xs">{footerMeta}</p> : null}
    </div>
  </Link>;
}
