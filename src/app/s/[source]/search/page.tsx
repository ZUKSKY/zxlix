import Link from "next/link";
import { Search } from "lucide-react";
import { RailSection } from "@/components/section";
import { unifiedList } from "@/lib/unified-catalog";
import { type EnabledSourceId } from "@/lib/sources";

interface PageProps { params: Promise<{ source: EnabledSourceId }>; searchParams: Promise<Record<string, string | undefined>> }

export default async function SearchPage({ params, searchParams }: PageProps) {
  const { source } = await params;
  const query = await searchParams;
  const q = query.q ?? query.keyword ?? "";
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const result = q ? await unifiedList(source, "search", { q, page: String(page) }) : { cards: [], playable: [], metadata: [], pagination: null };
  const cards = result.cards;
  const hasNext = result.pagination?.hasNextPage ?? !!q;

  return <main className="min-h-screen pb-[calc(7rem+env(safe-area-inset-bottom))] pt-28 lg:pb-16 lg:pt-32">
    <section className="mx-auto max-w-4xl px-4 pb-6 sm:px-5">
      <div className="glass-card rounded-[1.6rem] p-4 sm:rounded-[2rem] sm:p-5">
        <div className="mb-4">
          <p className="text-xs font-black uppercase tracking-[.24em] text-sky-300">Cari</p>
          <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Temukan tontonan</h1>
          <p className="mt-2 text-sm text-white/50">Pencarian dari katalog aktif + metadata anime. Naruto, One Piece, dan judul lama tetap muncul.</p>
        </div>
        <form className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="flex min-w-0 items-center gap-3 rounded-full border border-sky-300/15 bg-white/[.045] px-4 py-2">
            <Search className="size-5 shrink-0 text-sky-300" />
            <input name="q" defaultValue={q} placeholder="Cari judul..." className="min-w-0 flex-1 bg-transparent py-2 text-white outline-none placeholder:text-white/40" />
          </label>
          <button className="wuzz-button rounded-full px-5 py-3 font-black">Cari</button>
        </form>
      </div>
    </section>
    <RailSection title={q ? `Hasil: ${q}${page > 1 ? ` - Page ${page}` : ""}` : "Pencarian"} subtitle={q ? `${cards.length} item ditemukan (${result.playable.length} playable, ${result.metadata.length} metadata).` : "Masukkan judul yang ingin dicari."} cards={cards} />
    {q ? <section className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 pb-10 sm:px-5">
      {page > 1 ? <Link href={`/s/${source}/search?q=${encodeURIComponent(q)}${page - 1 > 1 ? `&page=${page - 1}` : ""}`} className="rounded-full border border-sky-300/20 bg-white/[.055] px-5 py-3 text-sm font-black text-white/75 transition hover:border-sky-300/50 hover:text-white">Sebelumnya</Link> : null}
      {hasNext ? <Link href={`/s/${source}/search?q=${encodeURIComponent(q)}&page=${page + 1}`} className="rounded-full bg-sky-400 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_28px_rgba(56,189,248,.28)] transition hover:bg-sky-300">Berikutnya</Link> : null}
    </section> : null}
  </main>;
}
