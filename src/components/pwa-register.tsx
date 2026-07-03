"use client";

import { useEffect } from "react";
import { useBookmarks } from "@/store/bookmarks";

export function PwaRegister() {
  const count = useBookmarks((state) => Object.keys(state.items).length);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  useEffect(() => {
    navigator.serviceWorker?.ready
      .then((registration) => registration.active?.postMessage({ type: "ZXLIX_BADGE", count }))
      .catch(() => {});
    if ("setAppBadge" in navigator && count) {
      (navigator as Navigator & { setAppBadge?: (count: number) => Promise<void> }).setAppBadge?.(count).catch(() => {});
    }
    if ("clearAppBadge" in navigator && !count) {
      (navigator as Navigator & { clearAppBadge?: () => Promise<void> }).clearAppBadge?.().catch(() => {});
    }
  }, [count]);

  return null;
}
