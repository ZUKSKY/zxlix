import Link from "next/link";
import { notFound } from "next/navigation";
import { Play, Star } from "lucide-react";
import { akDetail } from "@/lib/animekita";
import { bellDetail } from "@/lib/bellonime";
import { cleanSlug, genreSlug, imageProxy } from "@/lib/images";
import { isEnabledSource, type EnabledSourceId } from "@/lib/sources";
import { splitWinbuSlug, winbuDetail, winbuToCard } from "@/lib/winbu";
import { PosterImage } from "@/components/poster-image";
import { AnimeCardView } from "@/components/anime-card";
import { animeArtFallback } from "@/lib/media-art";

interface PageProps { params: Promise<{ source: string; slug: string }> }

export default async function SourceAnimeDetail({ params }: PageProps) {
  const { source, slug } = await params;
  if (!isEnabledSource(source)) notFound();
  const src = source as EnabledSourceId;

  if (src === "winbu") return <WinbuDetailPage slug={decodeURIComponent(slug)} />;
  if (src === "samehadaku" || src === "otakudesu") return <BellDetailPage source={src} slug={slug} />;
  return <AnimeKitaDetailPage source={src} slug={slug} />;
}

async function AnimeKitaDetailPage({ source, slug }: { source: EnabledSourceId; slug: string }) {
  const data = await akDetail(slug).catch(() => null);
  if (!data) return <NotFoundBox />;
  const art = await animeArtFallback(data.judul ?? data.title ?? slug);
  const genres = (Array.isArray(data.genre) ? data.genre : String(data.genre ?? "").split(",")).map((genre) => genre.trim()).filter(Boolean);
  const firstEpisode = data.chapter?.[0];
  return <main className="min-h-screen pb-[calc(7rem+env(safe-area-inset-bottom))] pt-28 lg:pb-16 lg:pt-32"><HeroBackdrop src={art.banner ?? data.cover ?? data.poster ?? data.thumb} /><section className="relative mx-auto grid max-w-7xl gap-6 px-4 sm:px-5 lg:grid-cols-[330px_1fr] lg:gap-8">
    <PosterPanel src={art.cover ?? data.cover} sources={[data.poster, data.thumb]} alt={data.judul ?? "Poster"} />
    <div>
      <RatingBadge rating={data.rating ?? data.score} />
      <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl md:text-6xl">{data.judul}</h1>
      <p className="mt-4 max-w-3xl whitespace-pre-line leading-7 text-white/65 sm:leading-8">{data.sinopsis}</p>
      {firstEpisode ? <Link href={`/s/${source}/watch/${encodeURIComponent(cleanSlug(firstEpisode.url ?? firstEpisode.id))}?series=${encodeURIComponent(data.series_id ?? slug)}&episode=${encodeURIComponent(String(firstEpisode.ch ?? "1"))}`} className="wuzz-button mt-6 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-black transition hover:-translate-y-0.5"><Play className="size-4 fill-white" />Tonton episode {firstEpisode.ch}</Link> : null}
      <div className="mt-6 flex flex-wrap gap-2">{genres.map((genre) => <Link key={genre} href={`/genres/${genreSlug(genre)}`} className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-sm text-sky-100 transition hover:bg-sky-300/18">{genre}</Link>)}</div>
      <div className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{(data.chapter ?? []).map((ep) => <Link key={ep.url ?? ep.id} href={`/s/${source}/watch/${encodeURIComponent(cleanSlug(ep.url ?? ep.id))}?series=${encodeURIComponent(data.series_id ?? slug)}&episode=${encodeURIComponent(String(ep.ch ?? "1"))}`} className="glass-card rounded-2xl px-4 py-3 transition hover:-translate-y-1 hover:border-sky-300/40"><p className="font-bold text-white">Episode {ep.ch}</p><p className="mt-1 text-xs text-white/45">{ep.date}</p></Link>)}</div>
    </div>
  </section></main>;
}

async function BellDetailPage({ source, slug }: { source: EnabledSourceId; slug: string }) {
  const data = await bellDetail(source, slug).catch(() => null);
  if (!data) return <NotFoundBox />;
  const art = await animeArtFallback(data.title ?? slug);
  const synopsis = data.synopsis?.paragraphs?.join("\n\n") ?? "";
  return <main className="min-h-screen pb-[calc(7rem+env(safe-area-inset-bottom))] pt-28 lg:pb-16 lg:pt-32"><HeroBackdrop src={art.banner ?? data.poster ?? data.thumbnail} /><section className="relative mx-auto grid max-w-7xl gap-6 px-4 sm:px-5 lg:grid-cols-[330px_1fr] lg:gap-8">
    <PosterPanel src={art.cover ?? data.poster ?? data.thumbnail} sources={[data.poster, data.thumbnail]} alt={data.title ?? "Poster"} />
    <div>
      <RatingBadge rating={typeof data.score === "object" ? String(data.score?.value ?? "-") : String(data.score ?? "-")} />
      <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl md:text-6xl">{data.title}</h1>
      <p className="mt-4 max-w-3xl whitespace-pre-line leading-7 text-white/65 sm:leading-8">{synopsis}</p>
      <div className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{(data.episodeList ?? []).map((ep) => <Link key={ep.episodeId ?? ep.href ?? ep.title} href={`/s/${source}/watch/${encodeURIComponent(ep.episodeId ?? cleanSlug(ep.href) ?? "")}?series=${encodeURIComponent(slug)}`} className="glass-card rounded-2xl px-4 py-3 transition hover:-translate-y-1 hover:border-sky-300/40"><p className="font-bold text-white">{ep.title ?? ep.episode}</p><p className="mt-1 text-xs text-white/45">{ep.releasedOn}</p></Link>)}</div>
    </div>
  </section></main>;
}

async function WinbuDetailPage({ slug }: { slug: string }) {
  const data = await winbuDetail(slug).catch(() => null);
  if (!data) return <NotFoundBox />;
  const art = await animeArtFallback(data.title);
  const { type, id } = splitWinbuSlug(slug);
  const watchHref = type === "film" ? `/s/winbu/watch/${encodeURIComponent(`film~${id}`)}?series=${encodeURIComponent(slug)}` : data.episodes[0] ? `/s/winbu/watch/${encodeURIComponent(data.episodes[0].id)}?series=${encodeURIComponent(slug)}` : "";
  return <main className="min-h-screen pb-[calc(7rem+env(safe-area-inset-bottom))] pt-28 lg:pb-16 lg:pt-32"><HeroBackdrop src={art.banner ?? data.image} /><section className="relative mx-auto grid max-w-7xl gap-6 px-4 sm:px-5 lg:grid-cols-[330px_1fr] lg:gap-8">
    <PosterPanel src={art.cover ?? data.image} sources={[data.image]} alt={data.title} />
    <div>
      <RatingBadge rating={data.rating} />
      <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl md:text-6xl">{data.title}</h1>
      <p className="mt-4 max-w-3xl whitespace-pre-line leading-7 text-white/65 sm:leading-8">{data.synopsis}</p>
      {watchHref ? <Link href={watchHref} className="wuzz-button mt-6 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-black transition hover:-translate-y-0.5"><Play className="size-4 fill-white" />Tonton sekarang</Link> : null}
      <div className="mt-6 flex flex-wrap gap-2">{data.genres.map((genre) => <Link key={genre.slug} href={`/genres/${genre.slug}`} className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-sm text-sky-100 transition hover:bg-sky-300/18">{genre.name}</Link>)}</div>
      <div className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{data.episodes.map((ep) => <Link key={ep.id} href={`/s/winbu/watch/${encodeURIComponent(ep.id)}?series=${encodeURIComponent(slug)}`} className="glass-card rounded-2xl px-4 py-3 transition hover:-translate-y-1 hover:border-sky-300/40"><p className="font-bold text-white">{ep.title}</p></Link>)}</div>
    </div>
  </section>
  {data.recommendations.length ? <section className="mx-auto mt-10 grid max-w-7xl grid-cols-2 gap-4 px-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{data.recommendations.slice(0, 12).map((item) => <AnimeCardView key={`${item.type}-${item.id}`} card={winbuToCard(item)} />)}</section> : null}
  </main>;
}

function PosterPanel({ src, sources = [], alt }: { src?: string; sources?: Array<string | undefined>; alt: string }) {
  return <div className="glass-card h-fit rounded-[1.6rem] p-3 sm:rounded-[2rem] sm:p-4"><PosterImage src={src} sources={sources} alt={alt} className="aspect-[2/3] w-full rounded-[1.25rem] object-cover sm:rounded-[1.4rem]" priority /></div>;
}

function HeroBackdrop({ src }: { src?: string }) {
  const proxied = imageProxy(src);
  return proxied ? <div className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] opacity-45" style={{ backgroundImage: `linear-gradient(180deg, rgba(2,6,23,.2), #030711), url(${proxied})`, backgroundSize: "cover", backgroundPosition: "center" }} /> : null;
}

function RatingBadge({ rating }: { rating?: string }) {
  return <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-sky-500/15 px-4 py-2 text-sm font-bold text-sky-200"><Star className="size-4 fill-sky-300 text-sky-300" />Rating · {rating ?? "-"}</div>;
}

function NotFoundBox() {
  return <main className="min-h-screen px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-32 text-white lg:pb-16"><div className="glass-card mx-auto max-w-2xl rounded-3xl p-8">Judul tidak ditemukan atau server sedang gangguan.</div></main>;
}
