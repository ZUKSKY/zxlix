import Link from "next/link";
import { Play, Star } from "lucide-react";
import { akDetail } from "@/lib/animekita";
import { cleanSlug, genreSlug } from "@/lib/images";
import { PosterImage } from "@/components/poster-image";

interface PageProps { params: Promise<{ slug: string }> }

export default async function AnimeDetail({ params }: PageProps) {
  const { slug } = await params;
  const data = await akDetail(slug).catch(() => null);
  if (!data) return <main className="min-h-screen px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-32 text-white lg:pb-16"><div className="glass-card mx-auto max-w-2xl rounded-3xl p-8">Judul tidak ditemukan atau server sedang gangguan.</div></main>;

  const genres = (Array.isArray(data.genre) ? data.genre : String(data.genre ?? "").split(",")).map((genre) => genre.trim()).filter(Boolean);
  const firstEpisode = data.chapter?.[0];

  return <main className="min-h-screen pb-[calc(7rem+env(safe-area-inset-bottom))] pt-28 lg:pb-16 lg:pt-32">
    <section className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-5 lg:grid-cols-[330px_1fr] lg:gap-8">
      <div className="glass-card h-fit rounded-[1.6rem] p-3 sm:rounded-[2rem] sm:p-4">
        <PosterImage src={data.cover} alt={data.judul ?? "Poster"} className="aspect-[2/3] w-full rounded-[1.25rem] object-cover sm:rounded-[1.4rem]" />
      </div>
      <div>
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-sky-500/15 px-4 py-2 text-sm font-bold text-sky-200"><Star className="size-4 fill-sky-300 text-sky-300" />{data.rating ?? data.score ?? "-"}</div>
        <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl md:text-6xl">{data.judul}</h1>
        <p className="mt-4 max-w-3xl whitespace-pre-line leading-7 text-white/65 sm:leading-8">{data.sinopsis}</p>
        {firstEpisode ? <Link href={`/watch/${encodeURIComponent(cleanSlug(firstEpisode.url ?? firstEpisode.id))}?series=${encodeURIComponent(data.series_id ?? slug)}&episode=${encodeURIComponent(String(firstEpisode.ch ?? "1"))}`} className="wuzz-button mt-6 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-black transition hover:-translate-y-0.5"><Play className="size-4 fill-white" />Tonton episode {firstEpisode.ch}</Link> : null}
        <div className="mt-6 flex flex-wrap gap-2">{genres.map((genre) => <Link key={genre} href={`/genres/${genreSlug(genre)}`} className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-sm text-sky-100 transition hover:bg-sky-300/18">{genre}</Link>)}</div>
        <div className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{(data.chapter ?? []).map((ep) => <Link key={ep.url ?? ep.id} href={`/watch/${encodeURIComponent(cleanSlug(ep.url ?? ep.id))}?series=${encodeURIComponent(data.series_id ?? slug)}&episode=${encodeURIComponent(String(ep.ch ?? "1"))}`} className="glass-card rounded-2xl px-4 py-3 transition hover:-translate-y-1 hover:border-sky-300/40"><p className="font-bold text-white">Episode {ep.ch}</p><p className="mt-1 text-xs text-white/45">{ep.date}</p></Link>)}</div>
      </div>
    </section>
  </main>;
}
