export function imageProxy(url?: string) {
  if (!url) return undefined;
  const encoded = typeof window === "undefined"
    ? Buffer.from(url, "utf8").toString("base64url")
    : btoa(unescape(encodeURIComponent(url))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return `/api/image?u=${encoded}`;
}

export function cleanSlug(value?: string | number) {
  return String(value ?? "")
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\/+/, "")
    .replace(/^(anime|series)\//i, "")
    .replace(/\/?$/, "")
    .trim();
}

export function genreSlug(value?: string) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
