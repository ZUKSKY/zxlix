import { NextRequest, NextResponse } from "next/server";
import { fetchSkipTimes } from "@/lib/aniskip";
import { anilistDetail } from "@/lib/anilist";

export const dynamic = "force-dynamic";

/**
 * GET /api/skip-times?title=...&episode=3  (or ?malId=21&episode=3)
 * Resolves the MAL id via AniList when only a title is available, then
 * fetches AniSkip community OP/ED timestamps.
 */
export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const episode = Number.parseInt(search.get("episode") ?? "0", 10);
  let malId = Number.parseInt(search.get("malId") ?? "0", 10);
  const title = (search.get("title") ?? "").trim();
  const length = Number.parseFloat(search.get("length") ?? "0") || 0;

  if (!episode) return NextResponse.json({ ok: true, intervals: [] });

  try {
    if (!malId && title) {
      const media = await anilistDetail({ search: title });
      malId = media?.idMal ?? 0;
    }
    if (!malId) return NextResponse.json({ ok: true, intervals: [] });
    const intervals = await fetchSkipTimes(malId, episode, length);
    return NextResponse.json(
      { ok: true, malId, intervals },
      { headers: { "Cache-Control": "public, max-age=86400" } },
    );
  } catch {
    return NextResponse.json({ ok: true, intervals: [] });
  }
}
