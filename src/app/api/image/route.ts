import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const allowedHostSuffixes = [
  "animekita.org",
  "winbu.net",
  "samehadaku.email",
  "samehadaku.care",
  "otakudesu.cloud",
  "otakudesu.blog",
  "wp.com",
  "blogger.com",
  "blogspot.com",
  "googleusercontent.com",
  "ggpht.com",
  "myanimelist.net",
  "anilist.co",
  "anilistcdn.com",
  "kitsu.io",
  "kitsu.app",
  "tmdb.org",
  "themoviedb.org",
  "cloudfront.net",
  "githubusercontent.com",
  "wikipedia.org",
  "wikimedia.org",
];

function isAllowedImageHost(hostname: string) {
  const host = hostname.toLowerCase();
  if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(host)) return false;
  if (/^(10|127|169\.254|172\.(1[6-9]|2\d|3[0-1])|192\.168)\./.test(host)) return false;
  return allowedHostSuffixes.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

export async function GET(request: NextRequest) {
  const encoded = request.nextUrl.searchParams.get("u");
  if (!encoded || encoded.length > 2400) return NextResponse.json({ error: "Invalid image" }, { status: 400 });

  let target = "";
  try {
    target = Buffer.from(encoded, "base64url").toString("utf8");
    const url = new URL(target);
    if (!["http:", "https:"].includes(url.protocol) || !isAllowedImageHost(url.hostname)) throw new Error("Invalid URL");
  } catch {
    return NextResponse.json({ error: "Invalid image" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(target, {
      cache: "force-cache",
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0", Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8" },
    }).catch(() => null);

    if (!response?.ok) return NextResponse.json({ error: "Image unavailable" }, { status: 404, headers: { "cache-control": "public, max-age=300" } });
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) return NextResponse.json({ error: "Invalid image type" }, { status: 415 });

    return new NextResponse(response.body, { headers: { "content-type": contentType, "cache-control": "public, max-age=86400, stale-while-revalidate=604800" } });
  } finally {
    clearTimeout(timeout);
  }
}
