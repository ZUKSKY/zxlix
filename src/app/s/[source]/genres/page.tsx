import Link from "next/link";
import { Tags } from "lucide-react";
import { bellGenres } from "@/lib/bellonime";
import { jikanGenres } from "@/lib/jikan";
import { type EnabledSourceId } from "@/lib/sources";
import { winbuGenres } from "@/lib/winbu";

interface PageProps { params: Promise<{ source: EnabledSourceId }> }

export default async function GenresPage({ params }: PageProps) {
  const { source } = await params;
  const sourceGenres = source === "winbu" ? await winbuGenres().catch(() => []) : source === "animekita" ? [] : await bellGenres(source).catch(() => []);
  const genres = sourceGenres.length ? sourceGenres.map((genre) => ({ slug: String("sourceId" in genre ? genre.sourceId : genre.slug), label: genre.label })) : jikanGenres.map((genre) => ({ slug: genre.slug, label: genre.label }));

  return <main className="min-h-screen pb-[calc(7rem+env(safe-area-inset-bottom))] pt-28 lg:pb-16 lg:pt-32">
    <section className="mx-auto max-w-7xl px-4 sm:px-5">
      <div className="glass-card rounded-[1.6rem] p-5 sm:rounded-[2rem] sm:p-7">
        <p className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/10 px-4 py-2 text-sm font-black text-sky-100"><Tags className="size-4" />Browse</p>
        <h1 className="mt-4 text-3xl font-black text-white sm:text-5xl">Genres</h1>
        <p className="mt-2 max-w-xl text-white/55">Genre dari katalog aktif. Kalau server gagal, fallback metadata anime tetap muncul.</p>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {genres.map((genre) => <Link key={genre.slug} href={`/s/${source}/genres/${encodeURIComponent(genre.slug)}`} className="glass-card rounded-2xl px-4 py-3 text-center text-sm font-bold text-white transition hover:-translate-y-1 hover:border-sky-300/40 hover:text-sky-300 sm:px-5 sm:py-4 sm:text-base">{genre.label}</Link>)}
      </div>
    </section>
  </main>;
}
