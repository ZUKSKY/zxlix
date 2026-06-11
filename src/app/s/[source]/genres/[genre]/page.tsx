import Link from "next/link";
import { RailSection } from "@/components/section";
import { jikanGenres } from "@/lib/jikan";
import { unifiedList } from "@/lib/unified-catalog";
import { type EnabledSourceId } from "@/lib/sources";

interface PageProps { params: Promise<{ source: EnabledSourceId; genre: string }>; searchParams: Promise<Record<string, string | undefined>> }

export default async function GenreDetail({ params, searchParams }: PageProps) {
  const { source, genre } = await params;
  const query = await searchParams;
  const safeGenre = decodeURIComponent(genre).trim();
  const meta = jikanGenres.find((item) => item.slug === safeGenre || item.animekita === safeGenre) ?? jikanGenres[0];
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const result = await unifiedList(source, "genre", { page: String(page), genre: safeGenre, url: safeGenre, jikanId: String(meta.jikanId) });
  const cards = result.cards;
  const hasNext = result.pagination?.hasNextPage ?? cards.length > 0;

  return <main className="min-h-screen pb-[calc(7rem+env(safe-area-inset-bottom))] pt-28 lg:pb-16">
    <RailSection title={`${meta.label}${page > 1 ? ` - Page ${page}` : ""}`} subtitle={`${cards.length} judul ditemukan. ${result.playable.length} punya stream, sisanya metadata catalog.`} cards={cards} />
    <section className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 pb-10 sm:px-5">
      {page > 1 ? <Link href={`/s/${source}/genres/${encodeURIComponent(safeGenre)}${page - 1 > 1 ? `?page=${page - 1}` : ""}`} className="rounded-full border border-sky-300/20 bg-white/[.055] px-5 py-3 text-sm font-black text-white/75 transition hover:border-sky-300/50 hover:text-white">Sebelumnya</Link> : null}
      {hasNext ? <Link href={`/s/${source}/genres/${encodeURIComponent(safeGenre)}?page=${page + 1}`} className="rounded-full bg-sky-400 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_28px_rgba(56,189,248,.28)] transition hover:bg-sky-300">Berikutnya</Link> : null}
    </section>
  </main>;
}
