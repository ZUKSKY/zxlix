import Link from "next/link";
import { CalendarDays, Play, Search, Sparkles, Star } from "lucide-react";
import { RailSection } from "@/components/section";
import { ContinueWatching } from "@/components/continue-watching";
import { PosterImage } from "@/components/poster-image";
import { imageProxy } from "@/lib/images";
import { sourceHome } from "@/lib/unified-catalog";
import { type CatalogSourceId } from "@/lib/sources";
import type { DisplayCard } from "@/components/anime-card";

function joinBase(base: string, path = "") {
  if (!path) return base || "/";
  return `${base === "/" ? "" : base}${path}`;
}

function cardHref(card: DisplayCard) {
  const slug = card.slug ?? card.animeId ?? "";
  const sourceBase = card.source && card.source !== "metadata" ? `/s/${card.source}` : "";
  if (card.playable === false) return `/search?q=${encodeURIComponent(card.title)}`;
  if (card.episodeId) return `${sourceBase}/watch/${encodeURIComponent(card.episodeId)}?series=${encodeURIComponent(slug)}`;
  return `${sourceBase}/anime/${encodeURIComponent(slug)}`;
}

export async function SourceHome({ source }: { source: CatalogSourceId }) {
  const data = await sourceHome(source);
  const latestCards = data.latest.slice(0, 18);
  const ongoingCards = data.ongoing.slice(0, 18);
  const recCards = data.popular.slice(0, 12);
  const movieCards = data.movies.slice(0, 12);
  const hero = latestCards[0] ?? recCards[0] ?? movieCards[0];
  const base = source === "all" ? "/" : `/s/${source}`;
  const heroArt = hero?.banner ?? hero?.poster;

  return <main className="min-h-screen overflow-hidden pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-16">
    <section className="cinematic-hero relative min-h-[560px] pt-28 sm:min-h-[680px] lg:min-h-[780px] lg:pt-32">
      {heroArt ? <div className="absolute inset-0 -z-10 opacity-55" style={{ background: `linear-gradient(90deg,#030711 0%,rgba(3,7,17,.76) 44%,rgba(3,7,17,.28)), url(${imageProxy(heroArt)}) center/cover` }} /> : null}
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#030711] to-transparent" />
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 lg:grid-cols-[1.05fr_.95fr]">
        <div className="relative z-10 max-w-3xl animate-float-up">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-white/[.035] px-4 py-2 text-sm font-black text-sky-100 backdrop-blur"><Sparkles className="size-4" /> Multi-source anime API</div>
          <h1 className="max-w-3xl text-4xl font-black leading-[.94] tracking-[-.06em] text-white drop-shadow-[0_4px_18px_rgba(0,0,0,.7)] sm:text-5xl md:text-7xl">Streaming anime minimal, cepat, rapi.</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-white/62">Satu interface untuk update episode, movie, genre, jadwal, pencarian, bookmark, dan server streaming pilihan.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={joinBase(base, "/latest")} className="blue-glow wuzz-button inline-flex items-center gap-2 rounded-full px-6 py-3 font-black transition hover:scale-105"><Play className="size-5 fill-white" />Mulai</Link>
            <Link href={joinBase(base, "/search")} className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-[#050b14]/70 px-6 py-3 font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.06)] backdrop-blur transition hover:border-sky-300/50 hover:bg-sky-500/12"><Search className="size-5" />Cari</Link>
            <Link href={joinBase(base, "/schedule")} className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-[#050b14]/70 px-6 py-3 font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.06)] backdrop-blur transition hover:border-sky-300/50 hover:bg-sky-500/12"><CalendarDays className="size-5" />Jadwal</Link>
          </div>
          <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
            {[["Update", latestCards.length], ["Pilihan", recCards.length], ["Movie", movieCards.length]].map(([label, count]) => <div key={label} className="glass-card rounded-2xl p-4"><p className="text-2xl font-black text-white">{count}+</p><p className="text-xs font-bold uppercase tracking-[.18em] text-sky-200/80">{label}</p></div>)}
          </div>
        </div>
        {hero ? <div className="relative z-10 hidden justify-end lg:flex">
          <div className="blue-orb absolute right-16 top-8 size-24 rounded-full bg-sky-400/20 blur-2xl" />
          <Link href={cardHref(hero)} className="glass-card group w-[380px] rotate-3 rounded-[2rem] p-4 transition duration-500 hover:rotate-0 hover:scale-[1.02]">
            <div className="relative overflow-hidden rounded-[1.4rem]">
              <PosterImage src={hero.poster} sources={[hero.banner]} alt={hero.title} className="aspect-[2/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.035]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4"><p className="mb-2 inline-flex items-center gap-1 rounded-full bg-sky-500 px-3 py-1 text-xs font-black text-white"><Star className="size-3 fill-white" />Pilihan</p><h2 className="line-clamp-2 text-2xl font-black text-white">{hero.title}</h2></div>
            </div>
          </Link>
        </div> : null}
      </div>
    </section>

    <ContinueWatching />

    <RailSection title="Episode Terbaru" subtitle="Update cepat dari semua server aktif." cards={latestCards} href={joinBase(base, "/latest")} />
    <RailSection title="Sedang Berjalan" subtitle="Series aktif minggu ini." cards={ongoingCards} href={joinBase(base, "/ongoing")} />
    <RailSection title="Rekomendasi" subtitle="Pilihan populer buat watchlist." cards={recCards} href={joinBase(base, "/popular")} />
    <RailSection title="Movies" subtitle="Film pilihan untuk maraton singkat." cards={movieCards} href={joinBase(base, "/movies")} />
  </main>;
}
