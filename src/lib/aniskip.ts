import { apiFetchJson } from "@/lib/api/http";

/**
 * AniSkip API — community timestamps for openings/endings.
 * https://api.aniskip.com — free, keyed by MAL id + episode number.
 */

export interface SkipInterval {
  type: "op" | "ed" | "mixed-op" | "mixed-ed" | "recap";
  startTime: number;
  endTime: number;
}

interface AniSkipResponse {
  found?: boolean;
  results?: Array<{ interval?: { startTime?: number; endTime?: number }; skipType?: string }>;
}

export async function fetchSkipTimes(malId: number, episode: number, episodeLengthSec = 0): Promise<SkipInterval[]> {
  if (!malId || !episode) return [];
  try {
    const url = `https://api.aniskip.com/v2/skip-times/${malId}/${episode}?types[]=op&types[]=ed&types[]=recap&episodeLength=${episodeLengthSec || 0}`;
    const json = await apiFetchJson<AniSkipResponse>(url, {
      timeoutMs: 8_000,
      retries: 0,
      headers: { Accept: "application/json" },
      next: { revalidate: 86_400 },
    });
    if (!json.found || !json.results) return [];
    return json.results
      .filter((item) => item.interval && typeof item.interval.startTime === "number" && typeof item.interval.endTime === "number")
      .map((item) => ({
        type: (item.skipType ?? "op") as SkipInterval["type"],
        startTime: item.interval!.startTime!,
        endTime: item.interval!.endTime!,
      }));
  } catch {
    return [];
  }
}

export function skipLabel(type: SkipInterval["type"]) {
  if (type === "ed" || type === "mixed-ed") return "Skip Ending";
  if (type === "recap") return "Skip Recap";
  return "Skip Intro";
}
