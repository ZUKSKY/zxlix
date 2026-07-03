import type { DisplayCard } from "@/components/anime-card";
import { apiFetchJson } from "@/lib/api/http";

/**
 * AniList GraphQL client (no API key needed, ~90 req/min).
 * Used for trending/seasonal rails, rich detail (characters, relations,
 * recommendations, trailer) and better banner art than scraper sources.
 */

const ENDPOINT = "https://graphql.anilist.co";

export interface AniListMedia {
  id: number;
  idMal?: number;
  title?: { romaji?: string; english?: string; native?: string };
  coverImage?: { extraLarge?: string; large?: string; medium?: string; color?: string };
  bannerImage?: string;
  season?: string;
  seasonYear?: number;
  format?: string;
  status?: string;
  episodes?: number;
  duration?: number;
  averageScore?: number;
  genres?: string[];
  description?: string;
  trailer?: { id?: string; site?: string; thumbnail?: string };
  nextAiringEpisode?: { episode?: number; airingAt?: number };
  relations?: { edges?: Array<{ relationType?: string; node?: AniListMedia }> };
  characters?: { edges?: Array<{ role?: string; node?: { name?: { full?: string }; image?: { large?: string } }; voiceActors?: Array<{ name?: { full?: string }; image?: { large?: string } }> }> };
  recommendations?: { nodes?: Array<{ mediaRecommendation?: AniListMedia }> };
}

interface GraphQLResponse<T> { data?: T; errors?: Array<{ message?: string }> }

async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const json = await apiFetchJson<GraphQLResponse<T>>(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    timeoutMs: 10_000,
    retries: 1,
    minIntervalMs: 700,
    next: { revalidate: 600 },
  });
  if (json.errors?.length) throw new Error(json.errors[0]?.message ?? "AniList error");
  if (!json.data) throw new Error("AniList empty response");
  return json.data;
}

const CARD_FIELDS = `
  id idMal
  title { romaji english native }
  coverImage { extraLarge large medium color }
  bannerImage
  season seasonYear format status episodes duration averageScore genres
  nextAiringEpisode { episode airingAt }
`;

export function anilistTitle(media?: AniListMedia) {
  return media?.title?.english || media?.title?.romaji || media?.title?.native || "Untitled";
}

export function anilistToCard(media: AniListMedia): DisplayCard {
  const score = media.averageScore ? (media.averageScore / 10).toFixed(1) : undefined;
  return {
    title: anilistTitle(media),
    poster: media.coverImage?.extraLarge || media.coverImage?.large || media.coverImage?.medium,
    banner: media.bannerImage,
    animeId: `al-${media.id}`,
    slug: `al-${media.id}`,
    type: media.format === "TV" ? "TV" : media.format,
    score,
    status: media.status === "RELEASING" ? "Ongoing" : media.status === "FINISHED" ? "Completed" : undefined,
    episode: media.nextAiringEpisode?.episode ? media.nextAiringEpisode.episode - 1 : media.episodes,
    meta: media.seasonYear ? `${media.seasonYear}` : undefined,
    genres: media.genres ?? [],
    playable: false,
  };
}

export type AniListListKind = "trending" | "popular" | "season" | "top" | "upcoming";

const SORTS: Record<AniListListKind, string> = {
  trending: "TRENDING_DESC",
  popular: "POPULARITY_DESC",
  season: "POPULARITY_DESC",
  top: "SCORE_DESC",
  upcoming: "POPULARITY_DESC",
};

export interface AniListPageInfo { currentPage?: number; hasNextPage?: boolean; total?: number }

export async function anilistList(kind: AniListListKind, opts: { page?: number; perPage?: number; season?: string; seasonYear?: number } = {}) {
  const { page = 1, perPage = 24 } = opts;
  const now = new Date();
  const season = opts.season ?? currentSeason(now);
  const seasonYear = opts.seasonYear ?? now.getFullYear();
  const filters = kind === "season"
    ? "season: $season, seasonYear: $seasonYear,"
    : kind === "upcoming"
      ? "status: NOT_YET_RELEASED,"
      : "";
  const data = await gql<{ Page?: { pageInfo?: AniListPageInfo; media?: AniListMedia[] } }>(
    `query ($page: Int, $perPage: Int${kind === "season" ? ", $season: MediaSeason, $seasonYear: Int" : ""}) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { currentPage hasNextPage total }
        media(type: ANIME, isAdult: false, ${filters} sort: ${SORTS[kind]}) { ${CARD_FIELDS} }
      }
    }`,
    kind === "season" ? { page, perPage, season, seasonYear } : { page, perPage },
  );
  return {
    media: data.Page?.media ?? [],
    pageInfo: data.Page?.pageInfo ?? null,
  };
}

export async function anilistSearch(q: string, page = 1, perPage = 24, filters: { genre?: string; seasonYear?: number; format?: string; status?: string } = {}) {
  if (!q.trim() && !filters.genre && !filters.seasonYear && !filters.format && !filters.status) return { media: [], pageInfo: null };
  const args: string[] = [];
  const vars: Record<string, unknown> = { page, perPage };
  const decl: string[] = ["$page: Int", "$perPage: Int"];
  if (q.trim()) { args.push("search: $search"); vars.search = q; decl.push("$search: String"); }
  if (filters.genre) { args.push("genre_in: $genres"); vars.genres = [filters.genre]; decl.push("$genres: [String]"); }
  if (filters.seasonYear) { args.push("seasonYear: $seasonYear"); vars.seasonYear = filters.seasonYear; decl.push("$seasonYear: Int"); }
  if (filters.format) { args.push("format: $format"); vars.format = filters.format; decl.push("$format: MediaFormat"); }
  if (filters.status) { args.push("status: $status"); vars.status = filters.status; decl.push("$status: MediaStatus"); }
  const data = await gql<{ Page?: { pageInfo?: AniListPageInfo; media?: AniListMedia[] } }>(
    `query (${decl.join(", ")}) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { currentPage hasNextPage total }
        media(type: ANIME, isAdult: false, ${args.join(", ")}${args.length ? "," : ""} sort: SEARCH_MATCH) { ${CARD_FIELDS} }
      }
    }`,
    vars,
  );
  return { media: data.Page?.media ?? [], pageInfo: data.Page?.pageInfo ?? null };
}

/** Rich detail: characters, relations, recommendations, trailer. */
export async function anilistDetail(opts: { id?: number; malId?: number; search?: string }) {
  const cond = opts.id ? "id: $id" : opts.malId ? "idMal: $idMal" : "search: $search";
  const data = await gql<{ Media?: AniListMedia }>(
    `query ($id: Int, $idMal: Int, $search: String) {
      Media(type: ANIME, ${cond}) {
        ${CARD_FIELDS}
        description(asHtml: false)
        trailer { id site thumbnail }
        relations { edges { relationType node { ${CARD_FIELDS} } } }
        characters(sort: ROLE, perPage: 12) {
          edges {
            role
            node { name { full } image { large } }
            voiceActors(language: JAPANESE, sort: RELEVANCE) { name { full } image { large } }
          }
        }
        recommendations(sort: RATING_DESC, perPage: 12) { nodes { mediaRecommendation { ${CARD_FIELDS} } } }
      }
    }`,
    { id: opts.id, idMal: opts.malId, search: opts.search },
  ).catch(() => ({ Media: undefined }));
  return data.Media;
}

export function currentSeason(date = new Date()): "WINTER" | "SPRING" | "SUMMER" | "FALL" {
  const month = date.getMonth() + 1;
  if (month <= 3) return "WINTER";
  if (month <= 6) return "SPRING";
  if (month <= 9) return "SUMMER";
  return "FALL";
}

export const seasonLabels: Record<string, string> = {
  WINTER: "Winter",
  SPRING: "Spring",
  SUMMER: "Summer",
  FALL: "Fall",
};

export const anilistFormats = [
  { value: "TV", label: "TV" },
  { value: "MOVIE", label: "Movie" },
  { value: "OVA", label: "OVA" },
  { value: "ONA", label: "ONA" },
  { value: "SPECIAL", label: "Special" },
];

export const anilistStatuses = [
  { value: "RELEASING", label: "Ongoing" },
  { value: "FINISHED", label: "Completed" },
  { value: "NOT_YET_RELEASED", label: "Upcoming" },
];

export const anilistGenres = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror",
  "Mahou Shoujo", "Mecha", "Music", "Mystery", "Psychological",
  "Romance", "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller",
];
