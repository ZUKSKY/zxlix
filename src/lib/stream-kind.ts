export type StreamKind = "video" | "hls" | "iframe" | "external";

export function detectStreamKind(link: string, kind?: StreamKind): StreamKind {
  if (kind) return kind;
  const lower = link.toLowerCase();
  const clean = lower.split("?")[0];
  if (clean.endsWith(".m3u8") || lower.includes(".m3u8")) return "hls";
  if (/\.(mp4|webm|ogg|mov)$/.test(clean) || /\/video\//.test(lower)) return "video";
  if (/youtube|youtu\.be|vimeo|dailymotion|stream|embed|player|drive\.google|blogger/.test(lower)) return "iframe";
  return "external";
}
