import Link from "next/link";
import { notFound } from "next/navigation";
import { RailSection } from "@/components/section";
import { unifiedList } from "@/lib/unified-catalog";
import { type EnabledSourceId } from "@/lib/sources";

const kindMap: Record<string, { api: "latest" | "popular" | "movies" | "ongoing"; title: string; subtitle: string }> = {
  latest: { api: "latest", title: "Update Terbaru", subtitle: "Rilis terbaru." },
  popular: { api: "popular", title: "Leaderboard", subtitle: "Rekomendasi populer." },
  movies: { api: "movies", title: "Movies", subtitle: "Film pilihan." },
  ongoing: { api: "ongoing", title: "Ongoing", subtitle: "Series masih berjalan." },
};

interface PageProps { params: Promise<{ source: EnabledSourceId; kind: string }>; searchParams: Promise<Record<string, string | undefined>> }

function pageHref(source: string, kind: string, page: number, type?: string) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (type && type !== "all") params.set("type", type);
  const query = params.toString();
  return `/s/${source}/${kind}${query ? `?${query}` : ""}`;
}

export default async function Page({ params, searchParams }: PageProps) {
  const { source, kind } = await params;
  const query = await searchParams;
  const cfg = kindMap[kind];
  if (!cfg) notFound();

  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const result = await unifiedList(source, cfg.api, { page: String(page), type: query.type ?? "all" });
  const cards = result.cards;
  const hasNext = result.pagination?.hasNextPage ?? cards.length > 0;

  return <main className="min-h-screen pb-[calc(7rem+env(safe-area-inset-bottom))] pt-28 lg:pb-16">
    {kind === "ongoing" ? <section className="mx-auto max-w-7xl px-4 pt-2 sm:px-5">
      <div className="flex flex-wrap gap-2">
        {[["all", "Semua"], ["anime", "Anime"], ["donghua", "Donghua"]].map(([value, label]) => <Link key={value} href={pageHref(source, "ongoing", 1, value)} className={`rounded-full border px-4 py-2 text-sm font-bold transition ${query.type === value || (!query.type && value === "all") ? "border-sky-300/50 bg-sky-400/18 text-white" : "border-sky-300/15 bg-white/[.045] text-white/65 hover:text-white"}`}>{label}</Link>)}
      </div>
    </section> : null}
    <RailSection title={`${cfg.title}${page > 1 ? ` - Page ${page}` : ""}`} subtitle={`${cfg.subtitle} ${cards.length} item dimuat.`} cards={cards} />
    <section className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 pb-10 sm:px-5">
      {page > 1 ? <Link href={pageHref(source, kind, page - 1, query.type)} className="rounded-full border border-sky-300/20 bg-white/[.055] px-5 py-3 text-sm font-black text-white/75 transition hover:border-sky-300/50 hover:text-white">Sebelumnya</Link> : null}
      {hasNext ? <Link href={pageHref(source, kind, page + 1, query.type)} className="rounded-full bg-sky-400 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_28px_rgba(56,189,248,.28)] transition hover:bg-sky-300">Berikutnya</Link> : null}
    </section>
  </main>;
}
