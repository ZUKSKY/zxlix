import { NextRequest, NextResponse } from "next/server";
import type { DisplayCard } from "@/components/anime-card";
import { sourceHome } from "@/lib/unified-catalog";

export const dynamic = "force-dynamic";

function cardHref(card: DisplayCard) {
  const slug = card.slug ?? card.animeId ?? "";
  const sourceBase = card.source && card.source !== "metadata" ? `/s/${card.source}` : "";
  if (card.episodeId) return `${sourceBase}/watch/${encodeURIComponent(card.episodeId)}?series=${encodeURIComponent(slug)}`;
  if (slug) return `${sourceBase}/anime/${encodeURIComponent(slug)}`;
  return `/search?q=${encodeURIComponent(card.title)}`;
}

/** GET /api/random → redirects to a random playable catalog item, not metadata-only search. */
export async function GET(request: NextRequest) {
  let target = "/discover/trending";
  try {
    const home = await sourceHome("all");
    const pool = [...home.latest, ...home.ongoing, ...home.popular, ...home.movies]
      .filter((card) => card.playable !== false && card.source && card.source !== "metadata" && (card.episodeId || card.slug || card.animeId));
    const random = pool[Math.floor(Math.random() * pool.length)];
    if (random) target = cardHref(random);
  } catch {
    // fall back to trending
  }
  return NextResponse.redirect(new URL(target, request.nextUrl.origin), { status: 307 });
}
