interface AnimeImageResult {
  cover?: string;
  banner?: string;
}

interface PosterLike { title: string; poster?: string; banner?: string }

const ANILIST = "https://graphql.anilist.co";
const KITSU = "https://kitsu.io/api/edge/anime";
const JIKAN = "https://api.jikan.moe/v4/anime";

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

function titleKey(value?: string) {
  return cleanMediaTitle(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function likelySameTitle(requested: string, candidate?: string) {
  const left = titleKey(requested);
  const right = titleKey(candidate);
  if (!left || !right) return false;
  if (left === right) return true;
  const short = left.length < right.length ? left : right;
  const long = left.length < right.length ? right : left;
  return short.length >= 12 && long.includes(short);
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
          title { romaji english native }
          coverImage { extraLarge large }
          bannerImage
        }
      }`,
      variables: { search },
    }),
  });
  if (!response.ok) return {};
  const json = await response.json() as { data?: { Media?: { title?: { romaji?: string; english?: string; native?: string }; coverImage?: { extraLarge?: string; large?: string }; bannerImage?: string } } };
  const media = json.data?.Media;
  const titles = [media?.title?.romaji, media?.title?.english, media?.title?.native];
  if (!titles.some((title) => likelySameTitle(search, title))) return {};
  return { cover: media?.coverImage?.extraLarge ?? media?.coverImage?.large, banner: media?.bannerImage };
}

async function kitsuArt(search: string, signal?: AbortSignal): Promise<AnimeImageResult> {
  const url = `${KITSU}?filter[text]=${encodeURIComponent(search)}&page[limit]=3`;
  const response = await fetch(url, { cache: "force-cache", signal, headers: { accept: "application/vnd.api+json" } });
  if (!response.ok) return {};
  const json = await response.json() as { data?: Array<{ attributes?: { canonicalTitle?: string; titles?: Record<string, string>; posterImage?: Record<string, string>; coverImage?: Record<string, string> } }> };
  const match = json.data?.find((item) => {
    const attrs = item.attributes;
    return [attrs?.canonicalTitle, ...Object.values(attrs?.titles ?? {})].some((title) => likelySameTitle(search, title));
  });
  const attrs = match?.attributes;
  return { cover: attrs?.posterImage?.original ?? attrs?.posterImage?.large, banner: attrs?.coverImage?.original ?? attrs?.coverImage?.large };
}

async function jikanArt(search: string, signal?: AbortSignal): Promise<AnimeImageResult> {
  const url = `${JIKAN}?q=${encodeURIComponent(search)}&limit=5&sfw=true`;
  const response = await fetch(url, { cache: "force-cache", signal, headers: { accept: "application/json" } });
  if (!response.ok) return {};
  const json = await response.json() as { data?: Array<{ title?: string; title_english?: string; title_japanese?: string; titles?: Array<{ title?: string }>; images?: { webp?: { large_image_url?: string; image_url?: string }; jpg?: { large_image_url?: string; image_url?: string } } }> };
  const match = json.data?.find((item) => [
    item.title,
    item.title_english,
    item.title_japanese,
    ...(item.titles ?? []).map((title) => title.title),
  ].some((candidate) => likelySameTitle(search, candidate)));
  return { cover: match?.images?.webp?.large_image_url ?? match?.images?.jpg?.large_image_url ?? match?.images?.webp?.image_url ?? match?.images?.jpg?.image_url };
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
    if (!result.cover) {
      const third = await jikanArt(search, controller.signal).catch((): AnimeImageResult => ({}));
      result = { cover: result.cover ?? third.cover, banner: result.banner ?? third.banner };
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

