import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { akEpisode } from "@/lib/animekita";
import { WatchPlayer, type WatchStream } from "@/components/watch-player";
import { MarkWatched } from "@/components/mark-watched";

interface PageProps { params: Promise<{ episodeId: string }>; searchParams: Promise<Record<string, string | undefined>> }

export default async function WatchPage({ params, searchParams }: PageProps) {
  const { episodeId } = await params;
  const query = await searchParams;
  const data = await akEpisode(episodeId, query.series ?? "", query.episode ?? "1");
  const streams: WatchStream[] = Object.entries(data?.streams ?? {}).flatMap(([quality, items]) =>
    items.map((stream, index) => ({
      quality,
      label: `${quality} • Server ${index + 1}`,
      link: stream.link ?? "",
      size: stream.size_kb,
    })),
  );

  return <main className="min-h-screen pb-[calc(7rem+env(safe-area-inset-bottom))] pt-28 lg:pb-16">
    <MarkWatched source="animekita" episodeId={decodeURIComponent(episodeId)} series={query.series} episode={query.episode} title={`Episode ${query.episode ?? ""}`} />
    <section className="mx-auto max-w-7xl px-4 sm:px-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={query.series ? `/anime/${encodeURIComponent(query.series)}` : "/latest"} className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-400/10 px-4 py-2 text-sm font-bold text-sky-100 transition hover:bg-sky-400/18"><ArrowLeft className="size-4" />Kembali</Link>
          <h1 className="mt-4 text-3xl font-black text-white sm:text-4xl">Nonton Episode {query.episode ?? ""}</h1>
          <p className="mt-2 text-sm text-white/55">Pilih server ringan. Player pakai preload metadata biar mobile tetap hemat.</p>
        </div>
      </div>
      <WatchPlayer streams={streams} />
    </section>
  </main>;
}
