import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { akDetail, akEpisode } from "@/lib/animekita";
import { bellEpisode, bellServer } from "@/lib/bellonime";
import { isEnabledSource, type EnabledSourceId } from "@/lib/sources";
import { winbuDetail, winbuEmbed, winbuEpisode } from "@/lib/winbu";
import { detectStreamKind } from "@/lib/stream-kind";
import { cleanSlug } from "@/lib/images";
import { WatchPlayer, type WatchMeta, type WatchStream } from "@/components/watch-player";
import { MarkWatched } from "@/components/mark-watched";

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

/** Parse the numeric episode from a query value like "12" or "Episode 12". */
function episodeNumber(value?: string) {
  const match = String(value ?? "").match(/(\d+(?:\.\d+)?)/);
  return match ? Number.parseFloat(match[1]) : undefined;
}

async function AnimeKitaWatch({ source, episodeId, query }: { source: string; episodeId: string; query: Record<string, string | undefined> }) {
  const [data, detail] = await Promise.all([
    akEpisode(episodeId, query.series ?? "", query.episode ?? "1").catch(() => null),
    query.series ? akDetail(query.series).catch(() => null) : Promise.resolve(null),
  ]);
  const streams: WatchStream[] = uniqueStreams(Object.entries(data?.streams ?? {}).flatMap(([quality, items]) =>
    items.map((stream, index) => ({ quality, label: `${quality} • Server ${index + 1}`, link: stream.link ?? "", size: stream.size_kb, kind: streamKind(stream.link ?? "") })),
  ));

  // Compute the next episode from the series chapter list (sorted newest-first upstream).
  let nextHref: string | undefined;
  const chapters = detail?.chapter ?? [];
  const decoded = decodeURIComponent(episodeId);
  const index = chapters.findIndex((ch) => cleanSlug(ch.url ?? ch.id) === decoded);
  const next = index > 0 ? chapters[index - 1] : undefined;
  if (next && query.series) {
    nextHref = `/s/${source}/watch/${encodeURIComponent(cleanSlug(next.url ?? next.id))}?series=${encodeURIComponent(query.series)}&episode=${encodeURIComponent(String(next.ch ?? ""))}`;
  }

  const movie = query.kind === "movie";
  const meta: WatchMeta = {
    source,
    episodeId: decoded,
    seriesTitle: detail?.judul ?? detail?.title ?? query.series,
    episodeNumber: movie ? undefined : episodeNumber(query.episode),
    nextHref: movie ? undefined : nextHref,
  };
  return <WatchShell title={movie ? "Nonton Movie" : `Nonton Episode ${query.episode ?? ""}`} back={query.series ? `/s/${source}/anime/${encodeURIComponent(query.series)}` : "/latest"} streams={streams} source={source} episodeId={episodeId} series={query.series} episode={movie ? "Movie" : query.episode} title2={movie ? "Movie" : undefined} meta={meta} poster={detail?.cover} />;
}

function extractBellUrl(value: unknown): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  for (const key of ["url", "link", "iframe", "embed", "streamingUrl", "defaultStreamingUrl", "src"]) {
    if (typeof record[key] === "string") return String(record[key]);
  }
  for (const key of ["data", "result", "stream", "server"]) {
    const nested = extractBellUrl(record[key]);
    if (nested) return nested;
  }
  return "";
}

function uniqueStreams(streams: WatchStream[]) {
  const seen = new Set<string>();
  return streams.filter((stream) => {
    const link = stream.link.trim();
    if (!link || seen.has(link)) return false;
    seen.add(link);
    return true;
  });
}

async function BellWatch({ source, episodeId, query }: { source: EnabledSourceId; episodeId: string; query: Record<string, string | undefined> }) {
  const data = await bellEpisode(source, episodeId).catch(() => null);
  const serverItems = data?.server?.qualities?.flatMap((quality) => (quality.serverList ?? []).map((server) => ({ quality: quality.title ?? "Server", server }))) ?? [];
  const resolved = await Promise.allSettled(serverItems.slice(0, 12).map(async ({ quality, server }, index): Promise<WatchStream> => {
    const response = server.serverId ? await bellServer(source, server.serverId).catch(() => undefined) : undefined;
    const link = extractBellUrl(response) || extractBellUrl(server.href);
    return { quality, label: `${quality} • ${server.title ?? `Server ${index + 1}`}`, link, kind: streamKind(link) };
  }));
  const streams: WatchStream[] = uniqueStreams([
    ...(data?.defaultStreamingUrl ? [{ quality: "Auto", label: "Auto • Default", link: data.defaultStreamingUrl, kind: streamKind(data.defaultStreamingUrl) }] : []),
    ...resolved.flatMap((item) => item.status === "fulfilled" ? [item.value] : []),
  ]);

  const nextId = data?.nextEpisode?.episodeId;
  const nextHref = nextId ? `/s/${source}/watch/${encodeURIComponent(nextId)}${query.series ? `?series=${encodeURIComponent(query.series)}` : ""}` : undefined;
  const meta: WatchMeta = {
    source,
    episodeId: decodeURIComponent(episodeId),
    seriesTitle: seriesTitleFrom(data?.title, query.series),
    episodeNumber: episodeNumber(data?.title) ?? episodeNumber(query.episode),
    nextHref,
  };
  return <WatchShell title={data?.title ?? "Nonton episode"} back={query.series ? `/s/${source}/anime/${encodeURIComponent(query.series)}` : "/latest"} streams={streams} source={source} episodeId={episodeId} series={query.series} title2={data?.title} meta={meta} poster={data?.poster} />;
}

/** "Naruto Episode 12 Sub Indo" → "Naruto"; falls back to the series slug. */
function seriesTitleFrom(title?: string, seriesSlug?: string) {
  const cleaned = String(title ?? "").replace(/\s*Episode\s+\d+.*$/i, "").trim();
  if (cleaned) return cleaned;
  return seriesSlug ? seriesSlug.replace(/-/g, " ").replace(/\s+sub\s+indo\s*$/i, "").trim() : undefined;
}

async function WinbuWatch({ episodeId, query }: { episodeId: string; query: Record<string, string | undefined> }) {
  const [data, detail] = await Promise.all([
    winbuEpisode(episodeId).catch(() => null),
    query.series ? winbuDetail(query.series).catch(() => null) : Promise.resolve(null),
  ]);
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
    kind: "download" as const,
  })));
  const streams = resolved.flatMap((item) => item.status === "fulfilled" ? [item.value] : []);

  // Next episode from the series episode list (order as scraped).
  let nextHref: string | undefined;
  const episodes = detail?.episodes ?? [];
  const index = episodes.findIndex((ep) => ep.id === episodeId);
  if (index !== -1 && query.series) {
    // Winbu lists can be either direction; prefer the numerically next title.
    const current = episodeNumber(episodes[index]?.title);
    const next = episodes.find((ep) => current !== undefined && episodeNumber(ep.title) === current + 1)
      ?? (index > 0 ? episodes[index - 1] : undefined);
    if (next && next.id !== episodeId) nextHref = `/s/winbu/watch/${encodeURIComponent(next.id)}?series=${encodeURIComponent(query.series)}`;
  }

  const meta: WatchMeta = {
    source: "winbu",
    episodeId,
    seriesTitle: detail?.title ?? seriesTitleFrom(data?.title, query.series),
    episodeNumber: episodeNumber(data?.title),
    nextHref,
  };
  return <WatchShell title={data?.title ?? "Nonton episode"} back={query.series ? `/s/winbu/anime/${encodeURIComponent(query.series)}` : "/latest"} streams={streams} downloads={downloads} source="winbu" episodeId={episodeId} series={query.series} title2={data?.title} meta={meta} poster={detail?.image} />;
}

function WatchShell({ title, back, streams, downloads = [], source, episodeId, series, episode, title2, meta = {}, poster }: { title: string; back: string; streams: WatchStream[]; downloads?: WatchStream[]; source: string; episodeId: string; series?: string; episode?: string; title2?: string; meta?: WatchMeta; poster?: string }) {
  return <main className="min-h-screen pb-[calc(7rem+env(safe-area-inset-bottom))] pt-28 lg:pb-16">
    <MarkWatched source={source} episodeId={decodeURIComponent(episodeId)} series={series} title={title2 ?? title} episode={episode} poster={poster} />
    <section className="mx-auto max-w-7xl px-4 sm:px-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={back} className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-400/10 px-4 py-2 text-sm font-bold text-sky-100 transition hover:bg-sky-400/18"><ArrowLeft className="size-4" />Kembali</Link>
          <h1 className="mt-4 text-3xl font-black text-white sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-white/55">Pilih server ringan. Kalau error, player otomatis coba alternatif.</p>
        </div>
      </div>
      <WatchPlayer streams={streams} downloads={downloads} meta={meta} />
    </section>
  </main>;
}

function NotAvailable() {
  return <main className="min-h-screen p-8 pt-32 text-white"><div className="glass-card rounded-3xl p-8">Server tidak valid.</div></main>;
}
