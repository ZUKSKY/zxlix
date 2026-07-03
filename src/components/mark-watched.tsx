"use client";

import { useEffect } from "react";
import { useHistory, historyId } from "@/store/history";

// Drop this on the watch page; it records the episode into history on mount.
export function MarkWatched({
  source,
  episodeId,
  series,
  title,
  episode,
  poster,
}: {
  source: string;
  episodeId: string;
  series?: string;
  title?: string;
  episode?: string;
  poster?: string;
}) {
  const markWatched = useHistory((state) => state.markWatched);

  useEffect(() => {
    markWatched({ id: historyId(source, episodeId), source, series, title, episode, poster });
  }, [markWatched, source, episodeId, series, title, episode, poster]);

  return null;
}
