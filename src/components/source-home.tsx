import Link from "next/link";
import { CalendarDays, Play, Search, Sparkles, Star, TrendingUp, Zap } from "lucide-react";
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
  const featured = [hero, ...recCards, ...movieCards].filter(Boolean).slice(0, 5) as DisplayCard[];
  const quickGenres = ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Romance"];

  return <main className="min-h-screen overflow-hidden pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-16">
    <section className="cinematic-hero relative min-h-[620px] pt-28 sm:min-h-[720px] lg:min-h-[820px] lg:pt-32">
      {heroArt ? <div className="absolute inset-0 -z-10 opacity-65" style={{ background: `linear-gradient(90deg,#030711 0%,rgba(3,7,17,.84) 38%,rgba(3,7,17,.36)), linear-gradient(180deg,rgba(3,7,17,.1),#030711 96%), url(${imageProxy(heroArt)}) center/cover` }} /> : null}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_70%_20%,rgba(14,165,233,.30),transparent_24rem)]" />
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#030711] via-[#030711]/84 to-transparent" />
      <div className="mx-auto grid min-h-[calc(620px-8rem)] max-w-7xl items-center gap-10 px-5 py-8 sm:min-h-[calc(720px-8rem)] lg:min-h-[calc(820px-8rem)] lg:grid-cols-[1.05fr_.95fr]">
        <div className="relative z-10 max-w-3xl animate-float-up">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-white/[.04] px-4 py-2 text-sm font-black text-sky-100 shadow-[0_0_35px_rgba(14,165,233,.16)] backdrop-blur"><Sparkles className="size-4" /> Nonton cepat tanpa ribet</div>
          <h1 className="max-w-3xl text-4xl font-black leading-[.92] tracking-[-.065em] text-white drop-shadow-[0_4px_18px_rgba(0,0,0,.75)] sm:text-5xl md:text-7xl">Streaming anime rasa bioskop.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/66">Update episode, movie, jadwal, bookmark, resume, dan server alternatif dalam tampilan gelap sinematik ala web streaming modern.</p>
          <form action={joinBase(base, "/search")} className="mt-8 flex max-w-2xl overflow-hidden rounded-full border border-sky-300/20 bg-[#050b14]/82 p-1.5 shadow-[0_24px_90px_rgba(0,0,0,.45),0_0_42px_rgba(14,165,233,.12)] backdrop-blur-xl">
            <div className="grid size-12 place-items-center text-sky-200"><Search className="size-5" /></div>
            <input name="q" placeholder="Cari judul favorit..." className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/38" />
            <button className="rounded-full bg-sky-500 px-5 text-sm font-black text-white shadow-[0_10px_34px_rgba(14,165,233,.35)] transition hover:bg-sky-400">Cari</button>
          </form>
          <div className="mt-5 flex flex-wrap gap-2">
            {quickGenres.map((genre) => <Link key={genre} href={`/genres/${genre.toLowerCase()}`} className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-xs font-bold text-white/70 backdrop-blur transition hover:border-sky-300/35 hover:bg-sky-400/10 hover:text-white">{genre}</Link>)}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={joinBase(base, "/latest")} className="blue-glow wuzz-button inline-flex items-center gap-2 rounded-full px-6 py-3 font-black transition hover:scale-105"><Play className="size-5 fill-white" />Mulai nonton</Link>
            <Link href="/discover/trending" className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-[#050b14]/70 px-6 py-3 font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.06)] backdrop-blur transition hover:border-sky-300/50 hover:bg-sky-500/12"><TrendingUp className="size-5" />Trending</Link>
            <Link href={joinBase(base, "/schedule")} className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-[#050b14]/70 px-6 py-3 font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.06)] backdrop-blur transition hover:border-sky-300/50 hover:bg-sky-500/12"><CalendarDays className="size-5" />Jadwal</Link>
          </div>
          <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
            {[["Update", latestCards.length], ["Pilihan", recCards.length], ["Movie", movieCards.length]].map(([label, count]) => <div key={label} className="glass-card rounded-2xl p-4"><p className="text-2xl font-black text-white">{count}+</p><p className="text-xs font-bold uppercase tracking-[.18em] text-sky-200/80">{label}</p></div>)}
          </div>
        </div>
        {hero ? <div className="relative z-10 hidden justify-end lg:flex">
          <div className="blue-orb absolute right-16 top-8 size-24 rounded-full bg-sky-400/20 blur-2xl" />
          <div className="grid w-[500px] grid-cols-[1fr_120px] gap-4">
            <Link href={cardHref(hero)} className="glass-card group rounded-[2rem] p-4 transition duration-500 hover:scale-[1.02]">
              <div className="relative overflow-hidden rounded-[1.4rem]">
                <PosterImage src={hero.poster} sources={[hero.banner]} alt={hero.title} className="aspect-[2/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/8 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4"><p className="mb-2 inline-flex items-center gap-1 rounded-full bg-sky-500 px-3 py-1 text-xs font-black text-white"><Star className="size-3 fill-white" />Pilihan</p><h2 className="line-clamp-2 text-2xl font-black text-white">{hero.title}</h2><span className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-xs font-black text-white backdrop-blur"><Play className="size-4 fill-white" />Tonton</span></div>
              </div>
            </Link>
            <div className="flex flex-col gap-3 pt-8">
              {featured.slice(1, 5).map((card, index) => <Link key={`${card.title}-${index}`} href={cardHref(card)} className="group relative overflow-hidden rounded-2xl border border-sky-300/15 bg-white/[.04] shadow-[0_18px_55px_rgba(0,0,0,.35)] transition hover:-translate-y-1 hover:border-sky-300/40">
                <PosterImage src={card.poster} sources={[card.banner]} alt={card.title} className="aspect-[2/3] w-full object-cover transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                <div className="absolute bottom-2 left-2 right-2"><p className="line-clamp-2 text-xs font-black text-white">{card.title}</p></div>
              </Link>)}
            </div>
          </div>
        </div> : null}
      </div>
      <div className="mx-auto -mt-8 grid max-w-7xl grid-cols-1 gap-3 px-5 pb-8 sm:grid-cols-3 lg:-mt-16">
        {[[Zap, "Server alternatif", "Pindah mirror cepat kalau error."], [Play, "Resume & auto-next", "Lanjut nonton tanpa cari ulang."], [Star, "Poster HD", "Fallback visual rapi, bukan blank."]].map(([Icon, title, text]) => {
          const IconCmp = Icon as typeof Zap;
          return <div key={String(title)} className="glass-card rounded-3xl p-5"><IconCmp className="mb-3 size-5 text-sky-300" /><p className="font-black text-white">{String(title)}</p><p className="mt-1 text-sm leading-6 text-white/55">{String(text)}</p></div>;
        })}
      </div>
    </section>

    <ContinueWatching />

    <RailSection title="Episode Terbaru" subtitle="Update cepat dari semua server aktif." cards={latestCards} href={joinBase(base, "/latest")} />
    <RailSection title="Sedang Berjalan" subtitle="Series aktif minggu ini." cards={ongoingCards} href={joinBase(base, "/ongoing")} />
    <RailSection title="Rekomendasi" subtitle="Pilihan populer buat watchlist." cards={recCards} href={joinBase(base, "/popular")} />
    <RailSection title="Movies" subtitle="Film pilihan untuk maraton singkat." cards={movieCards} href={joinBase(base, "/movies")} />
  </main>;
}
