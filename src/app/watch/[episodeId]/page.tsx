import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { akDetail, akEpisode } from "@/lib/animekita";
import { cleanSlug } from "@/lib/images";
import { WatchPlayer, type WatchMeta, type WatchStream } from "@/components/watch-player";
import { MarkWatched } from "@/components/mark-watched";

interface PageProps { params: Promise<{ episodeId: string }>; searchParams: Promise<Record<string, string | undefined>> }

function episodeNumber(value?: string) {
  const match = String(value ?? "").match(/(\d+(?:\.\d+)?)/);
  return match ? Number.parseFloat(match[1]) : undefined;
}

export default async function WatchPage({ params, searchParams }: PageProps) {
  const { episodeId } = await params;
  const query = await searchParams;
  const [data, detail] = await Promise.all([
    akEpisode(episodeId, query.series ?? "", query.episode ?? "1"),
    query.series ? akDetail(query.series).catch(() => null) : Promise.resolve(null),
  ]);
  const streams: WatchStream[] = Object.entries(data?.streams ?? {}).flatMap(([quality, items]) =>
    items.map((stream, index) => ({
      quality,
      label: `${quality} • Server ${index + 1}`,
      link: stream.link ?? "",
      size: stream.size_kb,
    })),
  );

  let nextHref: string | undefined;
  const chapters = detail?.chapter ?? [];
  const decoded = decodeURIComponent(episodeId);
  const index = chapters.findIndex((ch) => cleanSlug(ch.url ?? ch.id) === decoded);
  const next = index > 0 ? chapters[index - 1] : undefined;
  if (next && query.series) {
    nextHref = `/watch/${encodeURIComponent(cleanSlug(next.url ?? next.id))}?series=${encodeURIComponent(query.series)}&episode=${encodeURIComponent(String(next.ch ?? ""))}`;
  }

  const movie = query.kind === "movie";
  const meta: WatchMeta = {
    source: "animekita",
    episodeId: decoded,
    seriesTitle: detail?.judul ?? detail?.title ?? query.series,
    episodeNumber: movie ? undefined : episodeNumber(query.episode),
    nextHref: movie ? undefined : nextHref,
  };
  const title = movie ? "Nonton Movie" : `Nonton Episode ${query.episode ?? ""}`;

  return <main className="min-h-screen pb-[calc(7rem+env(safe-area-inset-bottom))] pt-28 lg:pb-16">
    <MarkWatched source="animekita" episodeId={decoded} series={query.series} episode={movie ? "Movie" : query.episode} title={movie ? "Movie" : `Episode ${query.episode ?? ""}`} poster={detail?.cover} />
    <section className="mx-auto max-w-7xl px-4 sm:px-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={query.series ? `/anime/${encodeURIComponent(query.series)}` : "/latest"} className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-400/10 px-4 py-2 text-sm font-bold text-sky-100 transition hover:bg-sky-400/18"><ArrowLeft className="size-4" />Kembali</Link>
          <h1 className="mt-4 text-3xl font-black text-white sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-white/55">Pilih server ringan. Player pakai preload metadata biar mobile tetap hemat.</p>
        </div>
      </div>
      <WatchPlayer streams={streams} meta={meta} />
    </section>
  </main>;
}
