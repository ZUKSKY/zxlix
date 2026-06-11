import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { akEpisode } from "@/lib/animekita";
import { bellEpisode, bellServer } from "@/lib/bellonime";
import { isEnabledSource, type EnabledSourceId } from "@/lib/sources";
import { winbuEmbed, winbuEpisode } from "@/lib/winbu";
import { detectStreamKind } from "@/lib/stream-kind";
import { WatchPlayer, type WatchStream } from "@/components/watch-player";

interface PageProps { params: Promise<{ source: string; episodeId: string }>; searchParams: Promise<Record<string, string | undefined>> }

export default async function SourceWatchPage({ params, searchParams }: PageProps) {
  const { source, episodeId } = await params;
  const query = await searchParams;
  if (!isEnabledSource(source)) return <NotAvailable />;
  const src = source as EnabledSourceId;

  if (src === "winbu") return <WinbuWatch episodeId={decodeURIComponent(episodeId)} query={query} />;
  if (src === "samehadaku" || src === "otakudesu") return <BellWatch source={src} episodeId={episodeId} query={query} />;
  return <AnimeKitaWatch source={src} episodeId={episodeId} query={query} />;
}

function streamKind(link: string): WatchStream["kind"] {
  return detectStreamKind(link);
}

async function AnimeKitaWatch({ source, episodeId, query }: { source: string; episodeId: string; query: Record<string, string | undefined> }) {
  const data = await akEpisode(episodeId, query.series ?? "", query.episode ?? "1").catch(() => null);
  const streams: WatchStream[] = Object.entries(data?.streams ?? {}).flatMap(([quality, items]) =>
    items.map((stream, index) => ({ quality, label: `${quality} • Server ${index + 1}`, link: stream.link ?? "", size: stream.size_kb, kind: streamKind(stream.link ?? "") })),
  );
  return <WatchShell title={`Nonton Episode ${query.episode ?? ""}`} back={query.series ? `/s/${source}/anime/${encodeURIComponent(query.series)}` : "/latest"} streams={streams} />;
}

function extractBellUrl(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  for (const key of ["url", "link", "iframe", "embed", "streamingUrl", "defaultStreamingUrl"]) {
    if (typeof record[key] === "string") return String(record[key]);
  }
  if (record.data && typeof record.data === "object") return extractBellUrl(record.data);
  return "";
}

async function BellWatch({ source, episodeId, query }: { source: EnabledSourceId; episodeId: string; query: Record<string, string | undefined> }) {
  const data = await bellEpisode(source, episodeId).catch(() => null);
  const serverItems = data?.server?.qualities?.flatMap((quality) => (quality.serverList ?? []).map((server) => ({ quality: quality.title ?? "Server", server }))) ?? [];
  const resolved = await Promise.allSettled(serverItems.slice(0, 16).map(async ({ quality, server }, index): Promise<WatchStream> => {
    const response = server.serverId ? await bellServer(source, server.serverId).catch(() => "") : server.href;
    const link = typeof response === "string" ? response : extractBellUrl(response);
    return { quality, label: `${quality} • Server ${index + 1}`, link, kind: streamKind(link) };
  }));
  const streams: WatchStream[] = [
    ...(data?.defaultStreamingUrl ? [{ quality: "Auto", label: "Auto • Default", link: data.defaultStreamingUrl, kind: streamKind(data.defaultStreamingUrl) }] : []),
    ...resolved.flatMap((item) => item.status === "fulfilled" ? [item.value] : []),
  ];
  return <WatchShell title={data?.title ?? "Nonton episode"} back={query.series ? `/s/${source}/anime/${encodeURIComponent(query.series)}` : "/latest"} streams={streams} />;
}

async function WinbuWatch({ episodeId, query }: { episodeId: string; query: Record<string, string | undefined> }) {
  const data = await winbuEpisode(episodeId).catch(() => null);
  const options = Object.entries(data?.streamOptions ?? {}).flatMap(([quality, servers]) => servers.map((server) => ({ quality, server })));
  const resolved = await Promise.allSettled(options.slice(0, 12).map(async ({ quality, server }, index) => {
    const embed = await winbuEmbed(server.post, server.nume, server.type).catch(() => ({ url: "" }));
    const link = embed.url ?? "";
    return { quality, label: `${quality} • Server ${index + 1}`, link, kind: streamKind(link) };
  }));
  const downloads: WatchStream[] = (data?.downloads ?? []).flatMap((group) => group.links.map((link, index) => ({
    quality: group.resolution,
    label: `${group.resolution} • Mirror ${index + 1}`,
    link: link.url,
    kind: streamKind(link.url),
  })));
  const streams = [...resolved.flatMap((item) => item.status === "fulfilled" ? [item.value] : []), ...downloads];
  return <WatchShell title={data?.title ?? "Nonton episode"} back={query.series ? `/s/winbu/anime/${encodeURIComponent(query.series)}` : "/latest"} streams={streams} />;
}

function WatchShell({ title, back, streams }: { title: string; back: string; streams: WatchStream[] }) {
  return <main className="min-h-screen pb-[calc(7rem+env(safe-area-inset-bottom))] pt-28 lg:pb-16">
    <section className="mx-auto max-w-7xl px-4 sm:px-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={back} className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-400/10 px-4 py-2 text-sm font-bold text-sky-100 transition hover:bg-sky-400/18"><ArrowLeft className="size-4" />Kembali</Link>
          <h1 className="mt-4 text-3xl font-black text-white sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-white/55">Pilih server ringan. Kalau error, player otomatis coba alternatif.</p>
        </div>
      </div>
      <WatchPlayer streams={streams} />
    </section>
  </main>;
}

function NotAvailable() {
  return <main className="min-h-screen p-8 pt-32 text-white"><div className="glass-card rounded-3xl p-8">Server tidak valid.</div></main>;
}
