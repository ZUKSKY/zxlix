export interface JikanAnime {
  mal_id: number;
  url?: string;
  title?: string;
  title_english?: string;
  title_japanese?: string;
  images?: { jpg?: { image_url?: string; large_image_url?: string }; webp?: { image_url?: string; large_image_url?: string } };
  type?: string;
  episodes?: number;
  status?: string;
  score?: number;
  synopsis?: string;
  year?: number;
  genres?: Array<{ mal_id: number; name: string }>;
}

interface JikanListResponse { data?: JikanAnime[] }
interface JikanDetailResponse { data?: JikanAnime }

const BASE = "https://api.jikan.moe/v4";

async function jikanRequest<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${BASE}/${path.replace(/^\//, "")}`, {
      signal: controller.signal,
      cache: "force-cache",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json() as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function jikanSearch(q: string, limit = 18, page = 1) {
  if (!q.trim()) return [];
  const res = await jikanRequest<JikanListResponse>(`anime?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}&sfw=true`);
  return res.data ?? [];
}

export async function jikanGenre(genreId: number, page = 1, limit = 24) {
  const res = await jikanRequest<JikanListResponse>(`anime?genres=${genreId}&page=${page}&limit=${limit}&sfw=true&order_by=popularity`);
  return res.data ?? [];
}

export async function jikanDetail(id: string | number) {
  const res = await jikanRequest<JikanDetailResponse>(`anime/${id}/full`);
  return res.data;
}

export function jikanToCard(item: JikanAnime) {
  return {
    title: item.title_english || item.title || item.title_japanese || "Untitled",
    poster: item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url || item.images?.webp?.image_url || item.images?.jpg?.image_url,
    animeId: `mal-${item.mal_id}`,
    slug: `mal-${item.mal_id}`,
    type: item.type,
    episode: item.episodes,
    score: item.score ? String(item.score) : undefined,
    status: item.status || (item.year ? String(item.year) : undefined),
    meta: item.episodes ? `${item.episodes} Episode` : item.type,
    genres: item.genres?.map((genre) => genre.name) ?? [],
    playable: false,
  };
}

export const jikanGenres = [
  { slug: "action", label: "Action", jikanId: 1, animekita: "action" },
  { slug: "adventure", label: "Adventure", jikanId: 2, animekita: "adventure" },
  { slug: "comedy", label: "Comedy", jikanId: 4, animekita: "comedy" },
  { slug: "drama", label: "Drama", jikanId: 8, animekita: "drama" },
  { slug: "fantasy", label: "Fantasy", jikanId: 10, animekita: "fantasy" },
  { slug: "romance", label: "Romance", jikanId: 22, animekita: "romance" },
  { slug: "school", label: "School", jikanId: 23, animekita: "school" },
  { slug: "sci-fi", label: "Sci-Fi", jikanId: 24, animekita: "sci-fi" },
  { slug: "shounen", label: "Shounen", jikanId: 27, animekita: "shounen" },
  { slug: "sports", label: "Sports", jikanId: 30, animekita: "sports" },
  { slug: "supernatural", label: "Supernatural", jikanId: 37, animekita: "supernatural" },
  { slug: "thriller", label: "Thriller", jikanId: 41, animekita: "thriller" },
];
