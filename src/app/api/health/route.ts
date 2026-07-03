import { NextResponse } from "next/server";
import { breakerSnapshot } from "@/lib/api/http";

export const dynamic = "force-dynamic";

const ANIME_BASE = process.env.ANIME_API_BASE_URL ?? "https://apps.animekita.org/api/v1.2.5";
const BELL_BASE = process.env.BELLONIME_API_URL ?? "http://localhost:3001";
const WINBU_BASE = process.env.WINBU_BASE_URL ?? "https://winbu.net";

const sources = [
  { name: "server-1", url: `${ANIME_BASE.replace(/\/$/, "")}/rekomendasi.php`, accept: "application/json" },
  { name: "server-2", url: `${BELL_BASE.replace(/\/$/, "")}/samehadaku/recent?page=1`, accept: "application/json", optional: true },
  { name: "server-3", url: `${BELL_BASE.replace(/\/$/, "")}/otakudesu/ongoing?page=1`, accept: "application/json", optional: true },
  { name: "server-4", url: WINBU_BASE, accept: "text/html" },
  { name: "metadata", url: "https://api.jikan.moe/v4/top/anime?limit=1", accept: "application/json" },
];

async function checkSource(source: typeof sources[number]) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3_500);
  try {
    const response = await fetch(source.url, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: source.accept, "User-Agent": "Mozilla/5.0 zxlix-health" },
    });
    return {
      name: source.name,
      ok: response.ok,
      status: response.status,
      optional: Boolean(source.optional),
      latencyMs: Date.now() - started,
    };
  } catch {
    return {
      name: source.name,
      ok: false,
      status: 0,
      optional: Boolean(source.optional),
      latencyMs: Date.now() - started,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  const results = await Promise.all(sources.map(checkSource));
  const required = results.filter((source) => !source.optional);
  const requiredOk = required.filter((source) => source.ok).length;
  const anyOk = results.some((source) => source.ok);
  const status = requiredOk === required.length ? "ok" : anyOk ? "degraded" : "down";

  return NextResponse.json({
    status,
    checkedAt: new Date().toISOString(),
    sources: results,
    circuits: breakerSnapshot(),
  }, { status: status === "down" ? 503 : 200 });
}
