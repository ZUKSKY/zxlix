import Link from "next/link";
import { notFound } from "next/navigation";
import { Compass } from "lucide-react";
import { anilistList, anilistToCard, currentSeason, seasonLabels, type AniListListKind } from "@/lib/anilist";
import { AnimeCardView } from "@/components/anime-card";

export const revalidate = 600;

const KINDS: Record<string, { kind: AniListListKind; title: string; desc: string }> = {
  trending: { kind: "trending", title: "Trending Sekarang", desc: "Anime paling ramai dibicarakan minggu ini." },
  popular: { kind: "popular", title: "Terpopuler", desc: "Anime dengan popularitas tertinggi sepanjang masa." },
  season: { kind: "season", title: "Musim Ini", desc: "Anime yang tayang musim ini." },
  top: { kind: "top", title: "Rating Tertinggi", desc: "Anime dengan skor tertinggi." },
  upcoming: { kind: "upcoming", title: "Akan Tayang", desc: "Anime yang paling ditunggu." },
};

interface PageProps { params: Promise<{ kind: string }>; searchParams: Promise<Record<string, string | undefined>> }

export default async function DiscoverPage({ params, searchParams }: PageProps) {
  const { kind } = await params;
  const query = await searchParams;
  const config = KINDS[kind];
  if (!config) notFound();

  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const { media, pageInfo } = await anilistList(config.kind, { page }).catch(() => ({ media: [], pageInfo: null }));
  const season = currentSeason();
  const year = new Date().getFullYear();

  return <main className="min-h-screen pb-[calc(7rem+env(safe-area-inset-bottom))] pt-28 lg:pb-16">
    <section className="mx-auto max-w-7xl px-4 sm:px-5">
      <div className="mb-6">
        <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[.28em] text-sky-300"><Compass className="size-4" />Jelajah</p>
        <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">{config.title}{kind === "season" ? ` · ${seasonLabels[season]} ${year}` : ""}</h1>
        <p className="mt-2 text-sm text-white/55">{config.desc} Klik judul untuk cari server streaming-nya.</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {Object.entries(KINDS).map(([key, item]) => <Link
          key={key}
          href={`/discover/${key}`}
          className={`rounded-full border px-4 py-2 text-sm font-bold transition ${key === kind ? "border-sky-300/60 bg-sky-400/18 text-white" : "border-white/10 bg-white/[.045] text-white/60 hover:border-sky-300/35 hover:text-white"}`}
        >{item.title}</Link>)}
      </div>

      {media.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
        {media.map((item) => <AnimeCardView key={item.id} card={anilistToCard(item)} />)}
      </div> : <div className="glass-card rounded-3xl p-8 text-center text-white/60">Data tidak tersedia. Coba lagi nanti.</div>}

      <div className="mt-8 flex items-center justify-center gap-3">
        {page > 1 ? <Link href={`/discover/${kind}?page=${page - 1}`} className="rounded-full border border-white/10 bg-white/[.045] px-5 py-2.5 text-sm font-black text-white/75 transition hover:border-sky-300/35 hover:text-white">Sebelumnya</Link> : null}
        <span className="rounded-full border border-sky-300/20 bg-sky-400/10 px-4 py-2 text-sm font-bold text-sky-100">Hal {page}</span>
        {pageInfo?.hasNextPage ? <Link href={`/discover/${kind}?page=${page + 1}`} className="rounded-full border border-white/10 bg-white/[.045] px-5 py-2.5 text-sm font-black text-white/75 transition hover:border-sky-300/35 hover:text-white">Berikutnya</Link> : null}
      </div>
    </section>
  </main>;
}
