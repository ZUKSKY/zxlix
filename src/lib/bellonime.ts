import type { DisplayCard } from "@/components/anime-card";
import { apiFetchJson } from "@/lib/api/http";
import { cleanSlug, genreSlug } from "@/lib/images";
import type { EnabledSourceId } from "@/lib/sources";

const BASE = process.env.BELLONIME_API_URL ?? "http://localhost:3001";

type BellSource = "samehadaku" | "otakudesu";
type BellListKind = "latest" | "ongoing" | "completed" | "popular" | "movies" | "search" | "genre";

interface Envelope<T> { ok?: boolean; data?: T; pagination?: Pagination | null; message?: string }
export interface Pagination { currentPage?: number; totalPages?: number; hasNextPage?: boolean; nextPage?: number | null; hasPrevPage?: boolean; prevPage?: number | null }
interface GenreItem { title?: string; genreId?: string; href?: string }
interface CardLike {
  title?: string; animeId?: string; episodeId?: string; batchId?: string; href?: string; poster?: string; thumbnail?: string;
  episodes?: string | number; episode?: string; releasedOn?: string; score?: { value?: string | number } | string | number;
  type?: string; status?: string; genreList?: GenreItem[]; samehadakuUrl?: string; otakudesuUrl?: string;
}
interface ListData { animeList?: CardLike[]; batchList?: CardLike[]; list?: Array<{ animeList?: CardLike[] }>; recent?: { animeList?: CardLike[] }; movie?: { animeList?: CardLike[] }; top10?: { animeList?: CardLike[] }; ongoing?: { animeList?: CardLike[] }; completed?: { animeList?: CardLike[] }; genreList?: GenreItem[]; days?: Array<{ day?: string; animeList?: CardLike[] }> }
interface DetailData extends CardLike { japanese?: string; english?: string; synopsis?: { paragraphs?: string[] }; episodeList?: CardLike[]; batchList?: CardLike[] }
interface EpisodeData extends CardLike { defaultStreamingUrl?: string; server?: { qualities?: Array<{ title?: string; serverList?: Array<{ title?: string; serverId?: string; href?: string }> }> }; prevEpisode?: CardLike; nextEpisode?: CardLike }

async function bellRequest<T>(path: string): Promise<Envelope<T>> {
  const json = await apiFetchJson<Envelope<T>>(`${BASE.replace(/\/$/, "")}/${path.replace(/^\//, "")}`, {
    timeoutMs: 15_000,
    retries: 1,
    next: { revalidate: 300 },
    headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 zxlix" },
  });
  if (json.ok === false) throw new Error(json.message || "Bellonime request failed");
  return json;
}

function isBell(source: EnabledSourceId): source is BellSource {
  return source === "samehadaku" || source === "otakudesu";
}

export function bellPath(source: BellSource, kind: BellListKind, params: Record<string, string> = {}) {
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  if (kind === "latest") return source === "samehadaku" ? `${source}/recent?page=${page}` : `${source}/ongoing?page=${page}`;
  if (kind === "ongoing") return source === "samehadaku" ? `${source}/ongoing?page=${page}&order=latest` : `${source}/ongoing?page=${page}`;
  if (kind === "completed") return `${source}/completed?page=${page}`;
  if (kind === "popular") return source === "samehadaku" ? `${source}/popular?page=${page}` : `${source}/completed?page=${page}`;
  if (kind === "movies") return source === "samehadaku" ? `${source}/movies?page=${page}` : `${source}/completed?page=${page}`;
  if (kind === "search") return source === "samehadaku" ? `${source}/search?q=${encodeURIComponent(params.q ?? params.keyword ?? "")}&page=${page}` : `${source}/search?q=${encodeURIComponent(params.q ?? params.keyword ?? "")}`;
  return `${source}/genres/${encodeURIComponent(params.genre ?? params.url ?? "action")}?page=${page}`;
}

function itemsFrom(data?: ListData) {
  return [
    ...(data?.animeList ?? []),
    ...(data?.batchList ?? []),
    ...(data?.recent?.animeList ?? []),
    ...(data?.movie?.animeList ?? []),
    ...(data?.top10?.animeList ?? []),
    ...(data?.ongoing?.animeList ?? []),
    ...(data?.completed?.animeList ?? []),
    ...(data?.list?.flatMap((group) => group.animeList ?? []) ?? []),
  ];
}

export function bellToCard(item: CardLike, source: BellSource): DisplayCard {
  const id = item.animeId ?? item.episodeId ?? cleanSlug(item.href) ?? item.title;
  return {
    title: item.title || "Untitled",
    poster: item.poster || item.thumbnail,
    animeId: id,
    slug: cleanSlug(id),
    episodeId: item.episodeId,
    episode: item.episode || item.episodes || item.releasedOn,
    type: item.type,
    score: typeof item.score === "object" ? String(item.score?.value ?? "") : item.score ? String(item.score) : undefined,
    status: item.status,
    meta: item.releasedOn || item.status || item.type,
    genres: item.genreList?.map((genre) => genre.title ?? "").filter(Boolean) ?? [],
    playable: true,
    source,
  };
}

export async function bellList(source: EnabledSourceId, kind: BellListKind, params: Record<string, string> = {}) {
  if (!isBell(source)) return { cards: [] as DisplayCard[], pagination: null as Pagination | null };
  const res = await bellRequest<ListData>(bellPath(source, kind, params));
  return { cards: itemsFrom(res.data).map((item) => bellToCard(item, source)), pagination: res.pagination ?? null };
}

export async function bellHome(source: EnabledSourceId) {
  if (!isBell(source)) return { latest: [], ongoing: [], popular: [], movies: [] };
  const [latest, ongoing, popular, movies] = await Promise.allSettled([
    bellList(source, "latest"), bellList(source, "ongoing"), bellList(source, "popular"), bellList(source, "movies"),
  ]);
  return {
    latest: latest.status === "fulfilled" ? latest.value.cards : [],
    ongoing: ongoing.status === "fulfilled" ? ongoing.value.cards : [],
    popular: popular.status === "fulfilled" ? popular.value.cards : [],
    movies: movies.status === "fulfilled" ? movies.value.cards : [],
  };
}

export async function bellGenres(source: EnabledSourceId) {
  if (!isBell(source)) return [];
  const res = await bellRequest<ListData>(`${source}/genres`);
  return (res.data?.genreList ?? []).map((genre) => ({ label: genre.title ?? "Genre", slug: genreSlug(genre.genreId || genre.href || genre.title), sourceId: genre.genreId || genreSlug(genre.title) }));
}

export async function bellDetail(source: EnabledSourceId, slug: string) {
  if (!isBell(source)) return undefined;
  const res = await bellRequest<DetailData>(`${source}/anime/${encodeURIComponent(slug)}`);
  return res.data;
}

export async function bellEpisode(source: EnabledSourceId, episodeId: string) {
  if (!isBell(source)) return undefined;
  const res = await bellRequest<EpisodeData>(`${source}/episode/${encodeURIComponent(episodeId)}`);
  return res.data;
}

export async function bellServer(source: EnabledSourceId, serverId: string) {
  if (!isBell(source)) return undefined;
  const res = await bellRequest<unknown>(`${source}/server/${encodeURIComponent(serverId)}`);
  return res.data;
}

