interface AnimeImageResult {
  cover?: string;
  banner?: string;
}

interface PosterLike { title: string; poster?: string; banner?: string }

const ANILIST = "https://graphql.anilist.co";
const KITSU = "https://kitsu.io/api/edge/anime";
const JIKAN = "https://api.jikan.moe/v4/anime";
const WIKIPEDIA = "https://en.wikipedia.org/w/api.php";

// In-memory memo so repeated renders don't refetch the same title.
const ART_TTL = 6 * 60 * 60 * 1000;
const artCache = new Map<string, { value: AnimeImageResult; at: number }>();

function cleanMediaTitle(title?: string) {
  return String(title ?? "")
    .replace(/\b(episode|eps?|batch|sub\s*indo|subtitle\s*indonesia|1080p|720p|480p|bluray|web-dl|webrip)\b.*$/i, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*]/g, " ")
    .replace(/\bseason\s+\d+\b/ig, " ")
    .replace(/\bs\d+\b/ig, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function looksLowQuality(url?: string) {
  const value = String(url ?? "").toLowerCase();
  if (!value) return true;
  return /placeholder|default|no-?image|thumb|thumbnail|\/small|small_|\/cache\/|\/thumbs?\/|-\d{2,3}x\d{2,3}\b|[?&](resize|w|width|h|height)=\d{2,3}\b|=w\d{2,3}\b|=s\d{2,3}\b|w\d{2,3}\//i.test(value);
}

async function anilistArt(search: string, signal?: AbortSignal): Promise<AnimeImageResult> {
  const response = await fetch(ANILIST, {
    method: "POST",
    cache: "force-cache",
    signal,
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      query: `query ($search: String) {
        Media(search: $search, type: ANIME) {
          coverImage { extraLarge large }
          bannerImage
        }
      }`,
      variables: { search },
    }),
  });
  if (!response.ok) return {};
  const json = await response.json() as { data?: { Media?: { coverImage?: { extraLarge?: string; large?: string }; bannerImage?: string } } };
  return { cover: json.data?.Media?.coverImage?.extraLarge ?? json.data?.Media?.coverImage?.large, banner: json.data?.Media?.bannerImage };
}

async function kitsuArt(search: string, signal?: AbortSignal): Promise<AnimeImageResult> {
  const url = `${KITSU}?filter[text]=${encodeURIComponent(search)}&page[limit]=1`;
  const response = await fetch(url, { cache: "force-cache", signal, headers: { accept: "application/vnd.api+json" } });
  if (!response.ok) return {};
  const json = await response.json() as { data?: Array<{ attributes?: { posterImage?: Record<string, string>; coverImage?: Record<string, string> } }> };
  const attrs = json.data?.[0]?.attributes;
  return { cover: attrs?.posterImage?.original ?? attrs?.posterImage?.large, banner: attrs?.coverImage?.original ?? attrs?.coverImage?.large };
}

export async function animeArtFallback(title?: string): Promise<AnimeImageResult> {
  const search = cleanMediaTitle(title);
  if (!search) return {};

  const key = search.toLowerCase();
  const cached = artCache.get(key);
  if (cached && Date.now() - cached.at < ART_TTL) return cached.value;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    let result: AnimeImageResult = await anilistArt(search, controller.signal).catch((): AnimeImageResult => ({}));
    if (!result.cover) {
      const second = await kitsuArt(search, controller.signal).catch((): AnimeImageResult => ({}));
      result = { cover: result.cover ?? second.cover, banner: result.banner ?? second.banner };
    }
    artCache.set(key, { value: result, at: Date.now() });
    return result;
  } catch {
    return {};
  } finally {
    clearTimeout(timeout);
  }
}

export async function enrichMissingPosters<T extends PosterLike>(cards: T[], limit = 12, bannerSlots = 2): Promise<T[]> {
  const targets = cards
    .map((card, index) => ({ card, index }))
    .filter(({ card, index }) => index < limit && (looksLowQuality(card.poster) || (index < bannerSlots && !card.banner)))
    .slice(0, limit);

  if (!targets.length) return cards;

  const art = await Promise.all(targets.map(({ card }) => animeArtFallback(card.title)));
  const next = [...cards];
  targets.forEach(({ card, index }, offset) => {
    const cover = art[offset]?.cover;
    const banner = art[offset]?.banner;
    if (cover || banner) next[index] = { ...card, poster: looksLowQuality(card.poster) ? (cover ?? card.poster) : card.poster, banner: banner ?? card.banner };
  });
  return next;
}

