import { apiFetchJson } from "@/lib/api/http";

export interface AkAnime {
  id?: string | number;
  url?: string;
  link?: string;
  judul?: string;
  anime_name?: string;
  title?: string;
  cover?: string;
  thumb?: string;
  poster?: string;
  lastch?: string;
  episode?: string;
  lastup?: string;
  release_date?: string;
  genre?: string[] | string;
  sinopsis?: string;
  studio?: string;
  score?: string;
  status?: string;
  rilis?: string;
  total_episode?: number | string;
  type?: string;
}

export interface AkDetail extends AkAnime {
  series_id?: string;
  rating?: string;
  published?: string;
  author?: string;
  chapter?: Array<{ id?: number; ch?: string; url?: string; date?: string; views?: number }>;
}

export type AnimeKitaItem = AkDetail & Record<string, unknown>;

type ListKind = "latest" | "recommended" | "movies" | "ongoing" | "search" | "genre" | "schedule";
type SearchResponse = { data?: Array<{ jumlah?: number; result?: AkAnime[]; pagination?: unknown }> };
type ScheduleResponse = { data?: unknown[] } | unknown[];

const BASE = process.env.ANIME_API_BASE_URL ?? "https://apps.animekita.org/api/v1.2.5";
const TOKEN = process.env.ANIME_API_TOKEN ?? "";
const headers: HeadersInit = {
  "User-Agent": "Dart/3.9 (dart:io)",
  Accept: "application/json",
  "Accept-Encoding": "gzip",
};

function safePage(value?: string) {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? String(page) : "1";
}

function safeOngoingType(value?: string) {
  return ["all", "anime", "donghua"].includes(value ?? "") ? value as string : "all";
}

function cleanSourceSlug(value: unknown) {
  return String(value ?? "")
    .replace(/^https?:\/\/[^/]+\/?/i, "")
    .replace(/^\/+|\/+$/g, "")
    .replace(/^anime\//, "")
    .trim();
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  return apiFetchJson<T>(`${BASE}/${path.replace(/^\//, "")}`, {
    ...init,
    timeoutMs: 10_000,
    retries: 1,
    cache: init?.cache,
    next: init?.method === "POST" || init?.body ? undefined : { revalidate: 300 },
    headers: { ...headers, ...(init?.headers ?? {}) },
  });
}

export function normalizeAnime(input: unknown): AnimeKitaItem {
  const item = (input && typeof input === "object" ? input : {}) as AkAnime & Record<string, unknown>;
  const title = String(item.judul ?? item.anime_name ?? item.title ?? "Untitled").trim();
  const slug = cleanSourceSlug(item.url ?? item.link ?? item.series_id ?? item.id ?? title.toLowerCase().replace(/\s+/g, "-"));
  const cover = typeof item.cover === "string" ? item.cover : typeof item.thumb === "string" ? item.thumb : typeof item.poster === "string" ? item.poster : undefined;
  return { ...item, judul: title || "Untitled", url: slug, cover } as AnimeKitaItem;
}

function normalizeMany(items: unknown[]) {
  return items.map(normalizeAnime).filter((item) => item.judul && item.judul !== "Untitled" && item.url);
}

function dedupeAnime(items: unknown[]) {
  const seen = new Set<string>();
  return normalizeMany(items).filter((item) => {
    const key = cleanSourceSlug(item.url || item.link || item.judul).toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function akList(kind: ListKind, params: Record<string, string> = {}) {
  const page = safePage(params.page);
  if (kind === "latest") return normalizeMany(await request<AkAnime[]>(`baruupload.php?page=${page}`));
  if (kind === "recommended") return normalizeMany(await request<AkAnime[]>("rekomendasi.php"));
  if (kind === "movies") return normalizeMany(await request<AkAnime[]>("movie.php"));
  if (kind === "ongoing") return normalizeMany(await request<AkAnime[]>(`home/ongoing.php?page=${page}&type=${safeOngoingType(params.type)}`));
  if (kind === "search") {
    const res = await request<SearchResponse>(`search.php?keyword=${encodeURIComponent(params.keyword ?? "")}`);
    return normalizeMany(res.data?.flatMap((group) => group.result ?? []) ?? []);
  }
  if (kind === "genre") return normalizeMany(await request<AkAnime[]>(`genreseries.php?page=${page}&url=${encodeURIComponent(params.url ?? "action/")}`));
  const res = await request<ScheduleResponse>("jadwal.php", { method: "POST" });
  return Array.isArray(res) ? res : res.data ?? [];
}

export async function akListPages(kind: Exclude<ListKind, "search" | "schedule">, pages = 3, params: Record<string, string> = {}) {
  const start = Number.parseInt(params.startPage ?? params.page ?? "1", 10) || 1;
  const results = await Promise.allSettled(Array.from({ length: pages }, (_, index) => akList(kind, { ...params, page: String(start + index) })));
  return dedupeAnime(results.flatMap((result) => result.status === "fulfilled" ? result.value : []));
}

export const akLatest = (page = 1) => akList("latest", { page: String(page) }) as Promise<AnimeKitaItem[]>;
export const akRecommended = () => akList("recommended") as Promise<AnimeKitaItem[]>;
export const akMovies = () => akList("movies") as Promise<AnimeKitaItem[]>;
export const akOngoing = (page = 1) => akList("ongoing", { page: String(page) }) as Promise<AnimeKitaItem[]>;
export const akSearch = (keyword: string) => akList("search", { keyword }) as Promise<AnimeKitaItem[]>;

function usableDetail(item?: AkDetail) {
  if (!item?.judul && !item?.title && !item?.anime_name) return undefined;
  if (!item.series_id && !item.cover && !item.chapter?.length) return undefined;
  return item;
}

export async function akDetail(slug: string) {
  const clean = slug.replace(/^\/+|\/+$/g, "");
  const candidates = Array.from(new Set([slug, clean, `${clean}/`].filter(Boolean)));
  for (const candidate of candidates) {
    const body = JSON.stringify({ get: "top", post_type: "1", post_id: candidate, token: TOKEN });
    const res = await request<{ data?: AkDetail[] }>(`series.php?url=${encodeURIComponent(candidate)}`, {
      method: "POST",
      body,
      headers: { "content-type": "text/plain; charset=utf-8" },
    }).catch(() => null);
    const detail = usableDetail(res?.data?.[0]);
    if (detail) return detail;
  }
  return undefined;
}

export async function akEpisode(episodeId: string, series = "", episode = "1") {
  const cleanEpisode = episode.replace(/[^0-9.]/g, "") || "1";
  const body = JSON.stringify({ post_type: "2", post_id: episodeId, series_id: series, series_url: series, episode: cleanEpisode, token: TOKEN });
  const res = await request<{ data?: Array<{ streams?: Record<string, Array<{ link?: string; reso?: string; size_kb?: number }>>; reso?: string[]; resoSize?: Record<string, string> }> }>(`series/episode/data.php?url=${encodeURIComponent(episodeId)}`, {
    method: "POST",
    body,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
  return res.data?.[0];
}

export function toCard(input: unknown) {
  const item = normalizeAnime(input);
  const episodeCandidate = item.episodeId ?? item.episode_id ?? item.lastch_url ?? item.chapter_url;
  const meta = item.lastup || item.release_date || item.rilis || item.episode;
  return {
    title: item.judul ?? "Untitled",
    poster: item.cover,
    animeId: item.url ?? String(item.id ?? ""),
    slug: item.url ?? String(item.id ?? ""),
    episode: item.episode ?? item.total_episode,
    episodeId: typeof episodeCandidate === "string" ? episodeCandidate : undefined,
    type: item.type ?? item.status,
    score: item.score,
    status: meta,
    genres: Array.isArray(item.genre) ? item.genre : String(item.genre ?? "").split(",").map((genre) => genre.trim()).filter(Boolean),
    playable: true,
  };
}

export const publicGenres = ["action", "adventure", "comedy", "drama", "fantasy", "romance", "school", "sci-fi", "shounen", "sports", "supernatural", "thriller"];

