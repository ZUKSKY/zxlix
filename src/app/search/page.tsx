import Link from "next/link";
import { ArrowLeft, ArrowRight, Search, SlidersHorizontal } from "lucide-react";
import { AnimeCardView } from "@/components/anime-card";
import { unifiedList } from "@/lib/unified-catalog";
import { anilistFormats, anilistGenres, anilistSearch, anilistStatuses, anilistToCard } from "@/lib/anilist";

interface PageProps { searchParams: Promise<Record<string, string | undefined>> }

function buildHref(params: Record<string, string | undefined>, overrides: Record<string, string | undefined>) {
  const merged = { ...params, ...overrides };
  const search = new URLSearchParams();
  for (const key of ["q", "genre", "year", "type", "status", "page"]) {
    const value = merged[key];
    if (value && value !== "1") search.set(key, value);
    if (key === "page" && value === "1") continue;
  }
  const qs = search.toString();
  return `/search${qs ? `?${qs}` : ""}`;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const q = query.q ?? query.keyword ?? "";
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const genre = query.genre ?? "";
  const year = Number.parseInt(query.year ?? "", 10) || undefined;
  const type = query.type ?? "";
  const status = query.status ?? "";
  const hasFilters = !!(genre || year || type || status);

  // Filtered search goes through AniList (rich filters); plain text search
  // stays on the unified scraper catalog so results are directly playable.
  let cards;
  let hasNext = false;
  if (hasFilters) {
    const result = await anilistSearch(q, page, 24, { genre: genre || undefined, seasonYear: year, format: type || undefined, status: status || undefined }).catch(() => ({ media: [], pageInfo: null }));
    cards = result.media.map(anilistToCard);
    hasNext = result.pageInfo?.hasNextPage ?? false;
  } else {
    const result = q ? await unifiedList("all", "search", { q, page: String(page) }) : { cards: [], pagination: null };
    cards = result.cards;
    hasNext = result.pagination?.hasNextPage ?? !!q;
  }

  const years = Array.from({ length: 30 }, (_, index) => new Date().getFullYear() + 1 - index);

  return <main className="min-h-screen pb-[calc(7rem+env(safe-area-inset-bottom))] pt-28 lg:pb-16 lg:pt-32">
    <section className="mx-auto max-w-7xl px-4 sm:px-5">
      <form className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3 rounded-full border border-sky-300/15 bg-white/[.045] py-1.5 pl-5 pr-1.5 backdrop-blur-xl transition focus-within:border-sky-300/40">
          <Search className="size-5 shrink-0 text-sky-300" />
          <input name="q" defaultValue={q} placeholder="Cari judul anime..." autoFocus className="min-w-0 flex-1 bg-transparent py-2.5 text-white outline-none placeholder:text-white/40" />
          <button className="wuzz-button rounded-full px-5 py-2.5 text-sm font-black">Cari</button>
        </div>

        <details className="group mt-3" open={hasFilters}>
          <summary className="inline-flex cursor-pointer select-none items-center gap-2 rounded-full border border-white/10 bg-white/[.045] px-4 py-2 text-xs font-black text-white/60 transition hover:border-sky-300/35 hover:text-white [&::-webkit-details-marker]:hidden">
            <SlidersHorizontal className="size-3.5 text-sky-300" />Filter{hasFilters ? <span className="rounded-full bg-sky-400/20 px-2 py-0.5 text-[10px] text-sky-200">aktif</span> : null}
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[.03] p-3 sm:grid-cols-4">
            <FilterSelect name="genre" label="Genre" value={genre} options={anilistGenres.map((item) => ({ value: item, label: item }))} />
            <FilterSelect name="year" label="Tahun" value={year ? String(year) : ""} options={years.map((item) => ({ value: String(item), label: String(item) }))} />
            <FilterSelect name="type" label="Tipe" value={type} options={anilistFormats} />
            <FilterSelect name="status" label="Status" value={status} options={anilistStatuses} />
            <div className="col-span-2 flex items-center gap-2 sm:col-span-4">
              <button className="rounded-full bg-sky-400 px-4 py-2 text-xs font-black text-slate-950 transition hover:bg-sky-300">Terapkan filter</button>
              {hasFilters ? <Link href={q ? `/search?q=${encodeURIComponent(q)}` : "/search"} className="rounded-full border border-white/10 px-4 py-2 text-xs font-black text-white/60 hover:text-white">Reset</Link> : null}
              <p className="text-[11px] text-white/35">Hasil filter berbasis metadata; klik judul untuk cari server-nya.</p>
            </div>
          </div>
        </details>
      </form>
    </section>

    <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-5">
      {q || hasFilters ? <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-xl font-black text-white sm:text-2xl">{q ? <>Hasil untuk &ldquo;{q}&rdquo;</> : "Hasil filter"}</h1>
        <p className="text-sm text-white/45">{cards.length} item{page > 1 ? ` - halaman ${page}` : ""}</p>
      </div> : null}

      {cards.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
        {cards.map((card, index) => <AnimeCardView key={`${card.title}-${index}`} card={card} />)}
      </div> : <div className="flex min-h-[36vh] flex-col items-center justify-center gap-2 text-center">
        <Search className="size-8 text-sky-300/40" />
        <p className="font-bold text-white/70">{q || hasFilters ? "Tidak ada hasil ditemukan." : "Mulai cari tontonan."}</p>
        <p className="text-sm text-white/40">{q || hasFilters ? "Coba kata kunci atau filter lain." : "Ketik judul lalu tekan Enter."}</p>
      </div>}

      {(q || hasFilters) && cards.length ? <div className="mt-10 flex items-center justify-center gap-3 pb-10">
        {page > 1 ? <Link href={buildHref(query, { page: String(page - 1) })} className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-white/[.055] px-5 py-2.5 text-sm font-black text-white/75 transition hover:border-sky-300/50 hover:text-white"><ArrowLeft className="size-4" /> Sebelumnya</Link> : null}
        {hasNext ? <Link href={buildHref(query, { page: String(page + 1) })} className="inline-flex items-center gap-2 rounded-full bg-sky-400 px-5 py-2.5 text-sm font-black text-slate-950 transition hover:bg-sky-300">Berikutnya <ArrowRight className="size-4" /></Link> : null}
      </div> : null}
    </section>
  </main>;
}

function FilterSelect({ name, label, value, options }: { name: string; label: string; value: string; options: Array<{ value: string; label: string }> }) {
  return <label className="block">
    <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-white/40">{label}</span>
    <select
      name={name}
      defaultValue={value}
      className="w-full rounded-xl border border-white/10 bg-[#0a1420] px-3 py-2 text-xs font-bold text-white outline-none transition focus:border-sky-300/50"
    >
      <option value="">Semua</option>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </label>;
}
