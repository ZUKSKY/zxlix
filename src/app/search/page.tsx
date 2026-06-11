import Link from "next/link";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { AnimeCardView } from "@/components/anime-card";
import { unifiedList } from "@/lib/unified-catalog";

interface PageProps { searchParams: Promise<Record<string, string | undefined>> }

function pageHref(q: string, page: number) {
  return `/search?q=${encodeURIComponent(q)}${page > 1 ? `&page=${page}` : ""}`;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const q = query.q ?? query.keyword ?? "";
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const result = q ? await unifiedList("all", "search", { q, page: String(page) }) : { cards: [], playable: [], metadata: [], pagination: null };
  const cards = result.cards;
  const hasNext = result.pagination?.hasNextPage ?? !!q;

  return <main className="min-h-screen pb-[calc(7rem+env(safe-area-inset-bottom))] pt-28 lg:pb-16 lg:pt-32">
    <section className="mx-auto max-w-7xl px-4 sm:px-5">
      <form className="mx-auto flex max-w-2xl items-center gap-3 rounded-full border border-sky-300/15 bg-white/[.045] py-1.5 pl-5 pr-1.5 backdrop-blur-xl transition focus-within:border-sky-300/40">
        <Search className="size-5 shrink-0 text-sky-300" />
        <input name="q" defaultValue={q} placeholder="Cari judul anime..." autoFocus className="min-w-0 flex-1 bg-transparent py-2.5 text-white outline-none placeholder:text-white/40" />
        <button className="wuzz-button rounded-full px-5 py-2.5 text-sm font-black">Cari</button>
      </form>
    </section>

    <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-5">
      {q ? <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-xl font-black text-white sm:text-2xl">Hasil untuk &ldquo;{q}&rdquo;</h1>
        <p className="text-sm text-white/45">{cards.length} item{page > 1 ? ` - halaman ${page}` : ""}</p>
      </div> : null}

      {cards.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
        {cards.map((card, index) => <AnimeCardView key={`${card.title}-${index}`} card={card} />)}
      </div> : <div className="flex min-h-[36vh] flex-col items-center justify-center gap-2 text-center">
        <Search className="size-8 text-sky-300/40" />
        <p className="font-bold text-white/70">{q ? "Tidak ada hasil ditemukan." : "Mulai cari tontonan."}</p>
        <p className="text-sm text-white/40">{q ? "Coba kata kunci lain." : "Ketik judul lalu tekan Enter."}</p>
      </div>}

      {q && cards.length ? <div className="mt-10 flex items-center justify-center gap-3 pb-10">
        {page > 1 ? <Link href={pageHref(q, page - 1)} className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-white/[.055] px-5 py-2.5 text-sm font-black text-white/75 transition hover:border-sky-300/50 hover:text-white"><ArrowLeft className="size-4" /> Sebelumnya</Link> : null}
        {hasNext ? <Link href={pageHref(q, page + 1)} className="inline-flex items-center gap-2 rounded-full bg-sky-400 px-5 py-2.5 text-sm font-black text-slate-950 transition hover:bg-sky-300">Berikutnya <ArrowRight className="size-4" /></Link> : null}
      </div> : null}
    </section>
  </main>;
}
