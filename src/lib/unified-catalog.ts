import { unstable_cache } from "next/cache";
import type { DisplayCard } from "@/components/anime-card";
import { akList, akListPages, toCard } from "@/lib/animekita";
import { bellHome, bellList, type Pagination } from "@/lib/bellonime";
import { jikanGenre, jikanSearch, jikanToCard } from "@/lib/jikan";
import type { CatalogSourceId, EnabledSourceId } from "@/lib/sources";
import { enrichMissingPosters } from "@/lib/media-art";
import { winbuHome, winbuList } from "@/lib/winbu";

export type UnifiedKind = "latest" | "ongoing" | "popular" | "movies" | "search" | "genre";

function titleKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function sameTitle(a: string, b: string) {
  const left = titleKey(a);
  const right = titleKey(b);
  if (!left || !right) return false;
  if (left === right) return true;
  const short = left.length < right.length ? left : right;
  const long = left.length < right.length ? right : left;
  return short.length >= 10 && long.includes(short);
}

export function mergeCards(...groups: DisplayCard[][]) {
  const out: DisplayCard[] = [];
  const keys: string[] = [];
  for (const card of groups.flat()) {
    if (!card.title || card.title === "Untitled") continue;
    const key = titleKey(card.title);
    if (keys.some((existing) => existing === key || (Math.min(existing.length, key.length) >= 10 && (existing.includes(key) || key.includes(existing))))) continue;
    keys.push(key);
    out.push(card);
  }
  return out;
}

function withSource(cards: DisplayCard[], source: EnabledSourceId) {
  return cards.map((card) => ({ ...card, source }));
}

async function animekitaHome() {
  const [latest, recommended, movies, ongoing] = await Promise.allSettled([
    akListPages("latest", 2), akList("recommended"), akList("movies"), akListPages("ongoing", 2),
  ]);
  return {
    latest: latest.status === "fulfilled" ? withSource(latest.value.map(toCard), "animekita") : [],
    ongoing: ongoing.status === "fulfilled" ? withSource(ongoing.value.map(toCard), "animekita") : [],
    popular: recommended.status === "fulfilled" ? withSource(recommended.value.map(toCard), "animekita") : [],
    movies: movies.status === "fulfilled" ? withSource(movies.value.map(toCard), "animekita") : [],
  };
}

async function sourceHomeUncached(source: CatalogSourceId) {
  if (source === "samehadaku" || source === "otakudesu") return enrichHome(await bellHome(source));
  if (source === "winbu") return enrichHome(await winbuHome());
  if (source === "all") {
    const [ak, same, otaku, winbu] = await Promise.allSettled([
      animekitaHome(), bellHome("samehadaku"), bellHome("otakudesu"), winbuHome(),
    ]);
    const homes = [ak, same, otaku, winbu].map((item) => item.status === "fulfilled" ? item.value : { latest: [], ongoing: [], popular: [], movies: [] });
    return enrichHome({
      latest: mergeCards(...homes.map((home) => home.latest)),
      ongoing: mergeCards(...homes.map((home) => home.ongoing)),
      popular: mergeCards(...homes.map((home) => home.popular)),
      movies: mergeCards(...homes.map((home) => home.movies)),
    });
  }
  return enrichHome(await animekitaHome());
}

export const sourceHome = unstable_cache(sourceHomeUncached, ["source-home"], { revalidate: 300 });

async function enrichHome<T extends { latest: DisplayCard[]; ongoing: DisplayCard[]; popular: DisplayCard[]; movies: DisplayCard[] }>(home: T): Promise<T> {
  const [latest, ongoing, popular, movies] = await Promise.all([
    enrichMissingPosters(home.latest),
    enrichMissingPosters(home.ongoing),
    enrichMissingPosters(home.popular),
    enrichMissingPosters(home.movies),
  ]);
  return { ...home, latest, ongoing, popular, movies };
}

async function animekitaList(kind: UnifiedKind, page: number, params: Record<string, string>) {
  const raw = kind === "search"
    ? await akList("search", { keyword: params.q ?? params.keyword ?? "" }).catch(() => [])
    : kind === "genre"
      ? await akListPages("genre", 2, { startPage: String(((page - 1) * 2) + 1), url: `${params.genre ?? params.url ?? "action"}/` }).catch(() => [])
      : await akListPages(kind === "popular" ? "recommended" : kind, kind === "popular" || kind === "movies" ? 1 : 2, { startPage: String(((page - 1) * 2) + 1), type: params.type ?? "all" }).catch(() => []);
  return withSource(raw.map(toCard), "animekita");
}

async function unifiedListUncached(source: CatalogSourceId, kind: UnifiedKind, params: Record<string, string> = {}) {
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  let pagination: Pagination | null = null;
  let playable: DisplayCard[] = [];

  // Metadata lookup runs in parallel with the playable-catalog calls below.
  const metadataPromise: Promise<DisplayCard[]> =
    kind === "search" && (params.q || params.keyword)
      ? jikanSearch(params.q ?? params.keyword ?? "", 24, page).then((items) => items.map(jikanToCard)).catch(() => [])
      : kind === "genre" && params.jikanId
        ? jikanGenre(Number(params.jikanId), page, 24).then((items) => items.map(jikanToCard)).catch(() => [])
        : Promise.resolve([]);

  if (source === "samehadaku" || source === "otakudesu") {
    const result = await bellList(source, kind === "genre" ? "genre" : kind, params).catch(() => ({ cards: [], pagination: null }));
    playable = result.cards;
    pagination = result.pagination;
  } else if (source === "winbu") {
    const result = await winbuList(kind, params).catch(() => ({ cards: [], pagination: null }));
    playable = result.cards;
    pagination = result.pagination;
  } else if (source === "all") {
    const [same, otaku, animekita, winbu] = await Promise.allSettled([
      bellList("samehadaku", kind === "genre" ? "genre" : kind, params),
      bellList("otakudesu", kind === "genre" ? "genre" : kind, params),
      animekitaList(kind, page, params),
      winbuList(kind, params),
    ]);
    playable = mergeCards(
      same.status === "fulfilled" ? same.value.cards : [],
      otaku.status === "fulfilled" ? otaku.value.cards : [],
      animekita.status === "fulfilled" ? animekita.value : [],
      winbu.status === "fulfilled" ? winbu.value.cards : [],
    );
    pagination = same.status === "fulfilled" ? same.value.pagination : winbu.status === "fulfilled" ? winbu.value.pagination : null;
  } else {
    playable = await animekitaList(kind, page, params);
  }

  const metadata = await metadataPromise;
  const [enrichedPlayable, enrichedMetadata] = await Promise.all([
    enrichMissingPosters(playable),
    enrichMissingPosters(metadata),
  ]);
  return { cards: mergeCards(enrichedPlayable, enrichedMetadata), playable: enrichedPlayable, metadata: enrichedMetadata, pagination };
}

export const unifiedList = unstable_cache(unifiedListUncached, ["unified-list"], { revalidate: 300 });
