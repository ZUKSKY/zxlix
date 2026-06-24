"use client";

import { Check } from "lucide-react";
import { useHistory, historyId } from "@/store/history";
import { useHydrated } from "@/store/use-hydrated";

// "Watched" overlay for poster cards that point at a specific episode.
// Renders a subtle dim + a corner check so it never collides with the
// score (top-left) / type (top-right) badges.
export function WatchedBadge({ source, episodeId }: { source?: string; episodeId?: string }) {
  const hydrated = useHydrated();
  const watched = useHistory((state) =>
    hydrated && episodeId ? !!state.items[historyId(source ?? "animekita", episodeId)] : false,
  );

  if (!watched) return null;

  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-10 bg-[#020617]/45" />
      <span className="absolute left-1/2 top-1/2 z-20 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border border-sky-400/40 bg-sky-500/90 px-2.5 py-1 text-[10px] font-black text-white shadow-[0_4px_14px_rgba(56,189,248,.35)] backdrop-blur">
        <Check className="size-3" />Ditonton
      </span>
    </>
  );
}
