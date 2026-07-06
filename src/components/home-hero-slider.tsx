"use client";

import Link from "next/link";
import { Calendar, ChevronLeft, ChevronRight, Play, Search, Star } from "lucide-react";
import { type MouseEvent, useEffect, useMemo, useState } from "react";
import { PosterImage } from "@/components/poster-image";
import type { DisplayCard } from "@/components/anime-card";

function joinBase(base: string, path = "") {
  if (!path) return base || "/";
  return `${base === "/" ? "" : base}${path}`;
}

function isMovie(card?: DisplayCard) {
  const text = `${card?.type ?? ""} ${card?.status ?? ""} ${card?.badge ?? ""} ${card?.meta ?? ""}`;
  return /movie|film/i.test(text);
}

function cardHref(card: DisplayCard) {
  const slug = card.slug ?? card.animeId ?? "";
  const sourceBase = card.source && card.source !== "metadata" ? `/s/${card.source}` : "";
  if (card.playable === false) return `/search?q=${encodeURIComponent(card.title)}`;
  if (card.episodeId) return `${sourceBase}/watch/${encodeURIComponent(card.episodeId)}?series=${encodeURIComponent(slug)}${isMovie(card) ? "&kind=movie" : ""}`;
  return `${sourceBase}/anime/${encodeURIComponent(slug)}`;
}

function cleanType(value?: string) {
  const text = String(value ?? "").trim();
  if (/movie|film/i.test(text)) return "MOVIE";
  return "SERIES";
}

function heroMeta(card?: DisplayCard) {
  const yearMatch = `${card?.title ?? ""} ${card?.meta ?? ""} ${card?.status ?? ""}`.match(/(19|20)\d{2}/);
  const kind = cleanType(card?.type);
  const year = yearMatch?.[0] ?? (kind === "MOVIE" ? "Movie" : "Series");
  const episode = kind === "MOVIE" ? "Movie" : (card?.episode ? `Ep ${card.episode}` : card?.status ?? "Update");
  const score = card?.score ?? "HD";
  const genres = card?.genres?.slice(0, 4) ?? ["Anime", "Streaming"];
  return { year, episode, kind, score, genres };
}

export function HomeHeroSlider({ slides, base }: { slides: DisplayCard[]; base: string }) {
  const safeSlides = useMemo(() => slides.filter((slide) => Boolean(slide?.banner ?? slide?.poster)).slice(0, 8), [slides]);
  const [active, setActive] = useState(0);
  const card = safeSlides[active] ?? safeSlides[0];
  const meta = heroMeta(card);

  useEffect(() => {
    if (safeSlides.length <= 1) return;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % safeSlides.length), 6500);
    return () => window.clearInterval(timer);
  }, [safeSlides.length]);

  function go(index: number, event?: MouseEvent<HTMLButtonElement>) {
    event?.preventDefault();
    event?.stopPropagation();
    if (!safeSlides.length) return;
    setActive((index + safeSlides.length) % safeSlides.length);
  }

  function move(step: number, event?: MouseEvent<HTMLButtonElement>) {
    go(active + step, event);
  }

  return <section className="idlix-hero relative h-[100svh] min-h-[560px] overflow-hidden bg-[#030711]">
    {safeSlides.map((slide, index) => <div key={`${slide.title}-${index}`} className={`absolute inset-0 transition-opacity duration-700 ${index === active ? "opacity-100" : "opacity-0"}`} aria-hidden={index !== active}>
      <PosterImage src={slide.banner} sources={[slide.poster]} alt={slide.title} priority={index === active || index === 0} className="size-full scale-[1.015] object-cover object-center" />
    </div>)}

    <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_18%,rgba(14,165,233,.24),transparent_27rem),linear-gradient(90deg,#030711_0%,rgba(3,7,17,.92)_30%,rgba(3,7,17,.48)_62%,rgba(3,7,17,.78)_100%)]" />
    <div className="absolute inset-x-0 bottom-0 h-[46%] bg-gradient-to-t from-[#030711] via-[#030711]/86 to-transparent" />
    <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-[#030711]/74 to-transparent" />

    <div className="relative z-10 mx-auto flex h-full max-w-7xl items-end px-4 pb-7 pt-28 sm:px-6 lg:pb-10 lg:pt-32">
      <div className="w-full max-w-4xl overflow-visible pb-2 sm:pb-3">
        <div className="mb-4 inline-flex rounded-full bg-sky-500 px-3 py-1 text-xs font-black uppercase tracking-[.25em] text-white shadow-[0_0_28px_rgba(14,165,233,.36)]">{meta.kind}</div>
        <h1 className="max-w-4xl overflow-visible pb-2 text-balance text-[2.65rem] font-black uppercase leading-[.98] tracking-[-.055em] text-white drop-shadow-[0_10px_42px_rgba(0,0,0,.90)] sm:text-6xl lg:text-[4.15rem] xl:text-[4.85rem]">{card?.title ?? "ZXLIX"}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-bold text-white/86">
          <span className="inline-flex items-center gap-1 text-yellow-300"><Star className="size-4 fill-yellow-300" />{meta.score}</span>
          <span className="text-white/35">•</span>
          <span className="inline-flex items-center gap-1"><Calendar className="size-4 text-sky-200/80" />{meta.year}</span>
          <span className="text-white/35">•</span>
          <span>{meta.episode}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {meta.genres.map((genre) => <span key={genre} className="rounded-full border border-sky-300/18 bg-black/35 px-3 py-1 text-xs font-bold text-sky-100 backdrop-blur">{genre}</span>)}
        </div>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-white/72 sm:text-base">Temukan anime dan movie dengan tampilan bioskop, cover full-screen HD, bookmark, continue watching, dan player cepat.</p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href={card ? cardHref(card) : joinBase(base, "/latest")} className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-6 py-3 text-sm font-black text-white shadow-[0_20px_60px_rgba(14,165,233,.36)] transition hover:-translate-y-0.5 hover:bg-sky-400"><Play className="size-5 fill-white" />Watch Now</Link>
          <form action={joinBase(base, "/search")} className="flex min-w-[240px] overflow-hidden rounded-full border border-sky-300/15 bg-black/45 p-1 backdrop-blur-xl sm:min-w-[300px]">
            <input name="q" placeholder="Cari anime..." className="min-w-0 flex-1 bg-transparent px-4 text-sm font-semibold text-white outline-none placeholder:text-white/38" />
            <button type="submit" className="grid size-10 place-items-center rounded-full bg-sky-500/20 text-white transition hover:bg-sky-500/35"><Search className="size-4" /></button>
          </form>
        </div>

        {safeSlides.length > 1 ? <div className="mt-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Previous slide" onClick={(event) => move(-1, event)} className="grid size-10 place-items-center rounded-full border border-sky-300/15 bg-black/45 text-white backdrop-blur-xl transition hover:bg-sky-500/25"><ChevronLeft className="size-5" /></button>
            <button type="button" aria-label="Next slide" onClick={(event) => move(1, event)} className="grid size-10 place-items-center rounded-full border border-sky-300/15 bg-black/45 text-white backdrop-blur-xl transition hover:bg-sky-500/25"><ChevronRight className="size-5" /></button>
          </div>
          <div className="flex items-center gap-2">
            {safeSlides.map((slide, index) => <button key={`${slide.title}-${index}`} type="button" aria-label={`Go to slide ${index + 1}`} onClick={(event) => go(index, event)} className={index === active ? "h-2 w-12 rounded-full bg-sky-400 shadow-[0_0_18px_rgba(56,189,248,.55)] transition-all" : "size-2 rounded-full bg-white/38 transition hover:bg-sky-200"} />)}
          </div>
        </div> : null}
      </div>
    </div>
  </section>;
}
