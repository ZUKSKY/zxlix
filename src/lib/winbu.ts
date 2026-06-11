import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import type { DisplayCard } from "@/components/anime-card";
import type { Pagination } from "@/lib/bellonime";

const BASE = (process.env.WINBU_BASE_URL ?? "https://winbu.net").replace(/\/$/, "");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export type WinbuType = "anime" | "series" | "film";
export interface WinbuItem { title: string; type?: string; id?: string; link?: string; image?: string; episode?: string; time?: string; views?: string; rating?: string; description?: string }
export interface WinbuStreamOption { server: string; post: string; nume: string; type: string }
export interface WinbuDownload { resolution: string; links: Array<{ server: string; url: string }> }
export interface WinbuDetail {
  title: string; image?: string; synopsis?: string; rating?: string; season?: string;
  genres: Array<{ name: string; slug: string }>;
  episodes: Array<{ title: string; id: string }>;
  recommendations: WinbuItem[];
  downloads: WinbuDownload[];
  streamOptions: Record<string, WinbuStreamOption[]>;
}

async function fetchHtml(path: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(`${BASE}${path.startsWith("/") ? "" : "/"}${path}`, {
        signal: controller.signal,
        next: { revalidate: 300 },
        headers: { "User-Agent": UA, Accept: "text/html" },
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return await res.text();
    } catch (error) {
      lastError = error;
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 400));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Winbu request gagal");
}

function parseLink(url?: string) {
  if (!url) return { slug: undefined as string | undefined, id: undefined as string | undefined };
  const parts = url.split("/").filter(Boolean);
  const id = parts.pop();
  const slug = parts.pop();
  return { slug: slug?.includes(".") ? undefined : slug, id };
}

function absoluteUrl(url?: string) {
  if (!url) return undefined;
  try { return new URL(url, BASE).toString(); } catch { return url; }
}

function imageFrom(node: cheerio.Cheerio<AnyNode>) {
  const img = node.find("img").first();
  const srcset = img.attr("srcset")?.split(",").map((part) => part.trim().split(/\s+/)[0]).filter(Boolean).pop();
  return absoluteUrl(img.attr("data-src") || img.attr("data-lazy-src") || img.attr("data-original") || srcset || img.attr("src"));
}

function extractPagination($: cheerio.CheerioAPI, currentPage: number): Pagination {
  let totalPages = 1;
  $(".pagination li a").each((_, el) => {
    const text = $(el).text().trim();
    if (/^\d+$/.test(text)) totalPages = Math.max(totalPages, Number.parseInt(text, 10));
  });
  let hasNext = false;
  let nextPage: number | null = null;
  const nextBtn = $(".pagination li a i.fa-caret-right").parent();
  if (nextBtn.length) {
    hasNext = true;
    const match = (nextBtn.attr("href") ?? "").match(/page\/(\d+)/);
    nextPage = match ? Number.parseInt(match[1], 10) : currentPage + 1;
    if (nextPage > totalPages) totalPages = nextPage;
  } else if (currentPage < totalPages) {
    hasNext = true;
    nextPage = currentPage + 1;
  }
  const prevPage = currentPage > 1 ? currentPage - 1 : null;
  return { currentPage, totalPages, hasNextPage: hasNext, nextPage, hasPrevPage: prevPage !== null, prevPage };
}

function listItems($: cheerio.CheerioAPI, scope: cheerio.Cheerio<never> | null, selector = ".ml-item"): WinbuItem[] {
  const items: WinbuItem[] = [];
  const root = scope ?? $.root();
  root.find(selector).each((_, el) => {
    const node = $(el);
    const title = node.find(".judul").first().text().trim() || node.find("a.ml-mask").attr("title")?.trim() || "";
    if (!title) return;
    const href = node.find("a.ml-mask").attr("href");
    const { slug, id } = parseLink(href);
    items.push({
      title,
      type: slug,
      id,
      link: href,
      image: imageFrom(node),
      episode: node.find(".mli-episode").first().text().trim() || undefined,
      time: node.find(".mli-waktu").first().text().trim() || undefined,
      views: node.find(".mli-mvi").first().text().trim() || undefined,
    });
  });
  return items;
}

function sectionByTitle($: cheerio.CheerioAPI, ...needles: string[]) {
  let found: cheerio.Cheerio<never> | null = null;
  $(".movies-list-wrap").each((_, el) => {
    if (found) return;
    const heading = $(el).find(".list-title h2").first().text();
    if (needles.some((needle) => heading.includes(needle))) found = $(el) as cheerio.Cheerio<never>;
  });
  return found;
}

export function winbuSlug(item: WinbuItem) {
  return `${item.type ?? "anime"}~${item.id ?? ""}`;
}

export function winbuToCard(item: WinbuItem): DisplayCard {
  const slug = winbuSlug(item);
  return {
    title: item.title,
    poster: item.image,
    animeId: slug,
    slug,
    episode: item.episode,
    type: item.type === "film" ? "Movie" : item.type === "series" ? "Series" : "Anime",
    score: item.rating && item.rating !== "-" ? item.rating : undefined,
    status: item.episode,
    duration: item.time,
    meta: item.views,
    genres: [],
    playable: true,
    source: "winbu",
  };
}

function pagePath(base: string, page: number) {
  return page > 1 ? `${base}/page/${page}/` : `${base}/`;
}

export async function winbuList(kind: "latest" | "ongoing" | "popular" | "movies" | "search" | "genre", params: Record<string, string> = {}) {
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  if (kind === "search") {
    const q = params.q ?? params.keyword ?? "";
    const path = page > 1 ? `/page/${page}/?s=${encodeURIComponent(q)}` : `/?s=${encodeURIComponent(q)}`;
    const $ = cheerio.load(await fetchHtml(path));
    const items: WinbuItem[] = [];
    $(".movies-list .a-item").each((_, el) => {
      const node = $(el);
      const title = node.find(".judul").first().text().trim();
      if (!title) return;
      const href = node.find("a.ml-mask").attr("href");
      const { slug, id } = parseLink(href);
      items.push({ title, type: slug, id, link: href, image: imageFrom(node), description: node.find(".mli-desc").text().trim() || undefined });
    });
    return { cards: items.map(winbuToCard), pagination: extractPagination($, page) };
  }
  if (kind === "genre") {
    const slug = params.genre ?? params.url ?? "action";
    const $ = cheerio.load(await fetchHtml(pagePath(`/genre/${encodeURIComponent(slug)}`, page)));
    const items: WinbuItem[] = [];
    $(".movies-list .ml-item").each((_, el) => {
      const node = $(el);
      const href = node.find("a.ml-mask").attr("href");
      if (!href) return;
      const { slug: type, id } = parseLink(href);
      const title = node.find("a.ml-mask").attr("title")?.trim() || node.find(".judul").first().text().trim();
      if (!title) return;
      const hidden = node.find(".info-hidden");
      items.push({
        title, type, id, link: href,
        image: imageFrom(node),
        views: node.find(".mli-mvi").first().text().trim() || undefined,
        time: node.find(".mli-waktu").first().text().trim() || undefined,
        rating: hidden.attr("data-rating") || undefined,
        episode: hidden.attr("data-episode") || undefined,
      });
    });
    return { cards: items.map(winbuToCard), pagination: extractPagination($, page) };
  }
  if (kind === "popular") {
    const home = await winbuHome();
    return { cards: home.popular, pagination: null as Pagination | null };
  }
  const path = kind === "movies" ? "/film" : "/animedonghua";
  const $ = cheerio.load(await fetchHtml(pagePath(path, page)));
  const section = sectionByTitle($, kind === "movies" ? "Film" : "Anime Donghua", "Latest");
  const items = listItems($, section);
  return { cards: items.map(winbuToCard), pagination: extractPagination($, page) };
}

export async function winbuHome() {
  const $ = cheerio.load(await fetchHtml("/"));
  const top10 = sectionByTitle($, "Top 10");
  const popularItems: WinbuItem[] = [];
  if (top10) {
    $(top10).find(".ml-item-potrait").slice(0, 10).each((_, el) => {
      const node = $(el);
      const title = node.find(".judul").first().text().trim();
      if (!title) return;
      const href = node.find("a.ml-mask").attr("href");
      const { slug, id } = parseLink(href);
      popularItems.push({ title, type: slug, id, link: href, image: imageFrom(node), rating: node.find(".mli-mvi").first().text().trim() || undefined });
    });
  }
  const latest = listItems($, sectionByTitle($, "Anime Donghua"));
  const movies = listItems($, sectionByTitle($, "Film Terbaru"));
  const series = listItems($, sectionByTitle($, "Jepang Korea China Barat"));
  return {
    latest: latest.map(winbuToCard),
    ongoing: series.map(winbuToCard),
    popular: popularItems.map(winbuToCard),
    movies: movies.map(winbuToCard),
  };
}

function extractStreamOptions($: cheerio.CheerioAPI) {
  const options: Record<string, WinbuStreamOption[]> = {};
  $(".player-modes .dropdown").each((_, el) => {
    const node = $(el);
    const resolution = node.find("button").first().text().trim() || "Default";
    const servers: WinbuStreamOption[] = [];
    node.find(".east_player_option").each((_, opt) => {
      const optNode = $(opt);
      servers.push({
        server: optNode.find("span").first().text().trim() || "Server",
        post: optNode.attr("data-post") ?? "",
        nume: optNode.attr("data-nume") ?? "",
        type: optNode.attr("data-type") ?? "schtml",
      });
    });
    if (servers.length) options[resolution] = servers;
  });
  const directIframe = $("iframe").first().attr("src");
  if (!Object.keys(options).length && directIframe) {
    options.Auto = [{ server: "Embed", post: absoluteUrl(directIframe) ?? directIframe, nume: "", type: "direct" }];
  }
  return options;
}

function extractDownloads($: cheerio.CheerioAPI): WinbuDownload[] {
  const downloads: WinbuDownload[] = [];
  $(".download-eps ul li").each((_, el) => {
    const node = $(el);
    const resolution = node.find("strong").first().text().trim();
    if (!resolution) return;
    const links: Array<{ server: string; url: string }> = [];
    node.find("span a").each((_, link) => {
      const anchor = $(link);
      const url = anchor.attr("href");
      if (url) links.push({ server: anchor.text().trim() || "Mirror", url });
    });
    downloads.push({ resolution, links });
  });
  return downloads;
}

export function splitWinbuSlug(value: string): { type: WinbuType; id: string } {
  const [type, ...rest] = value.split("~");
  const id = rest.join("~");
  if ((type === "anime" || type === "series" || type === "film") && id) return { type, id };
  return { type: "anime", id: value };
}

export async function winbuDetail(slug: string): Promise<WinbuDetail> {
  const { type, id } = splitWinbuSlug(slug);
  const $ = cheerio.load(await fetchHtml(`/${type}/${encodeURIComponent(id)}/`));
  let rating: string | undefined;
  let season: string | undefined;
  const genres: Array<{ name: string; slug: string }> = [];
  $(".mli-mvi").each((_, el) => {
    const node = $(el);
    const text = node.text();
    if (text.includes("Rating")) {
      rating = node.find('span[itemprop="ratingValue"]').text().trim() || undefined;
    } else if (text.includes("Genre")) {
      node.find("a").each((_, link) => {
        const anchor = $(link);
        const name = anchor.text().trim();
        const genreSlug = (anchor.attr("href") ?? "").split("/genre/")[1]?.replace(/\/$/, "") ?? name.toLowerCase();
        if (name) genres.push({ name, slug: genreSlug });
      });
    } else if (node.find('a[rel="tag"]').length > 0) {
      season = node.find("a").first().text().trim() || undefined;
    }
  });
  const episodes: Array<{ title: string; id: string }> = [];
  $(".tvseason .les-content a").each((_, el) => {
    const node = $(el);
    const epId = parseLink(node.attr("href")).id;
    if (epId) episodes.push({ title: node.text().trim() || epId, id: epId });
  });
  const recommendations: WinbuItem[] = [];
  $(".rekom .ml-item-rekom").each((_, el) => {
    const node = $(el);
    const title = node.find(".judul").first().text().trim();
    if (!title) return;
    const href = node.find("a.ml-mask").attr("href");
    const { slug: recType, id: recId } = parseLink(href);
    recommendations.push({ title, type: recType, id: recId, link: href, image: imageFrom(node), rating: node.find(".mli-mvi").first().text().trim() || undefined });
  });
  return {
    title: $("div.mli-info .judul").first().text().trim() || id,
    image: imageFrom($(".mli-thumb-box")),
    synopsis: $(".mli-desc").first().text().trim() || undefined,
    rating, season, genres, episodes, recommendations,
    downloads: extractDownloads($),
    streamOptions: extractStreamOptions($),
  };
}

export async function winbuEpisode(episodeId: string) {
  const path = episodeId.startsWith("film~") ? `/film/${encodeURIComponent(episodeId.slice(5))}/` : `/${encodeURIComponent(episodeId)}/`;
  const $ = cheerio.load(await fetchHtml(path));
  return {
    title: $(".list-title h2").first().text().trim() || $("div.mli-info .judul").first().text().trim() || episodeId,
    downloads: extractDownloads($),
    streamOptions: extractStreamOptions($),
  };
}

export async function winbuEmbed(post: string, nume: string, type: string) {
  if (type === "direct") return { html: "", url: absoluteUrl(post) };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${BASE}/wp-admin/admin-ajax.php`, {
      method: "POST",
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent": UA,
        "X-Requested-With": "XMLHttpRequest",
        Origin: BASE,
        Referer: `${BASE}/`,
      },
      body: new URLSearchParams({ action: "player_ajax", post, nume, type }).toString(),
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    const src = $("iframe").first().attr("src") || html.match(/<iframe[^>]+src=["']([^"']+)["']/i)?.[1] || html.match(/src=["']([^"']+)["']/i)?.[1];
    return { html, url: absoluteUrl(src) };
  } finally {
    clearTimeout(timeout);
  }
}

export async function winbuGenres() {
  const $ = cheerio.load(await fetchHtml("/"));
  const genres: Array<{ label: string; slug: string }> = [];
  $("#sidebar ul.years.genres li").each((_, el) => {
    const anchor = $(el).find("a").first();
    const label = anchor.text().trim().replace(/\s*\(\d+\)/, "");
    const slug = (anchor.attr("href") ?? "").split("/genre/")[1]?.replace(/\/$/, "");
    if (label && slug) genres.push({ label, slug });
  });
  return genres;
}

