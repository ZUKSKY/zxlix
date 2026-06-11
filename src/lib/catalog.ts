import { akDetail, akLatest, akMovies, akOngoing, akRecommended, akSearch, type AnimeKitaItem } from "./animekita";

export interface CardItem { id: string; slug: string; title: string; poster?: string; badge?: string; meta?: string; score?: string; genres: string[]; synopsis?: string; totalEpisode?: string | number }
export interface EpisodeLink { id: string; title: string; episode?: string; date?: string; views?: string | number }
export interface DetailItem extends CardItem { status?: string; studio?: string; release?: string; type?: string; episodes: EpisodeLink[] }

export function toCard(raw: AnimeKitaItem): CardItem {
  const title = String(raw.judul ?? raw.title ?? "Untitled");
  const slug = String(raw.url ?? raw.series_id ?? raw.id ?? title.toLowerCase().replace(/\s+/g, "-"));
  const genres = Array.isArray(raw.genre) ? raw.genre.map(String) : typeof raw.genre === "string" ? raw.genre.split(",").map((x) => x.trim()).filter(Boolean) : [];
  return {
    id: String(raw.id ?? slug),
    slug,
    title,
    poster: typeof raw.cover === "string" ? raw.cover : typeof raw.poster === "string" ? raw.poster : undefined,
    badge: String(raw.lastup ?? raw.lastch ?? raw.type ?? ""),
    meta: String(raw.status ?? raw.rilis ?? raw.published ?? raw.studio ?? ""),
    score: raw.score ? String(raw.score) : raw.rating ? String(raw.rating) : undefined,
    genres,
    synopsis: typeof raw.sinopsis === "string" ? raw.sinopsis : undefined,
    totalEpisode: raw.total_episode as string | number | undefined,
  };
}

export function toDetail(raw: AnimeKitaItem): DetailItem {
  const card = toCard(raw);
  const chapters = Array.isArray(raw.chapter) ? raw.chapter as AnimeKitaItem[] : [];
  return {
    ...card,
    slug: String(raw.series_id ?? card.slug),
    status: raw.status ? String(raw.status) : undefined,
    studio: raw.author ? String(raw.author) : raw.studio ? String(raw.studio) : undefined,
    release: raw.published ? String(raw.published) : raw.rilis ? String(raw.rilis) : undefined,
    type: raw.type ? String(raw.type) : undefined,
    episodes: chapters.map((chapter) => ({
      id: String(chapter.url ?? chapter.id ?? ""),
      title: `Episode ${String(chapter.ch ?? chapter.episode ?? "")}`.trim(),
      episode: String(chapter.ch ?? ""),
      date: chapter.date ? String(chapter.date) : undefined,
      views: chapter.views as string | number | undefined,
    })).filter((episode) => episode.id),
  };
}

export async function getHomeData() {
  const [latest, recommended, ongoing, movies] = await Promise.allSettled([akLatest(1), akRecommended(), akOngoing(1), akMovies()]);
  const safe = (result: PromiseSettledResult<AnimeKitaItem[]>) => result.status === "fulfilled" ? result.value.map(toCard) : [];
  return { latest: safe(latest), recommended: safe(recommended), ongoing: safe(ongoing), movies: safe(movies) };
}

export async function getList(kind: string, page = 1, q = "") {
  if (kind === "latest") return (await akLatest(page)).map(toCard);
  if (kind === "recommended") return (await akRecommended()).map(toCard);
  if (kind === "ongoing") return (await akOngoing(page)).map(toCard);
  if (kind === "movies") return (await akMovies()).map(toCard);
  if (kind === "search") return q ? (await akSearch(q)).map(toCard) : [];
  return (await akLatest(page)).map(toCard);
}

export async function getDetail(slug: string) {
  const raw = await akDetail(slug);
  if (!raw) throw new Error("Anime tidak ditemukan");
  return toDetail(raw as AnimeKitaItem);
}
