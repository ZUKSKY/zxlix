export type StreamKind = "video" | "hls" | "iframe" | "external" | "download";

// Hosts / URL patterns that serve download-only files (force a browser download,
// not in-page playback). These must never be fed to <video> or an <iframe>.
const DOWNLOAD_HINT = /(\bdownload\b|[?&](dl|attachment|download)=|[?&]export=download|response-content-disposition=attachment|\/dl\/|\/download\/|\/get\/|drive\.google\.com\/uc\?|pixeldrain\.com\/(api|u)\/|gofile\.io\/d\/|mega\.nz|mediafire|zippyshare|krakenfiles|katfile|rapidgator|nitroflare|turbobit|1fichier|send\.cm|uploadrar|acefile|kfiles|terabox|drop\.download|doodrive|\.zip(\?|#|$)|\.rar(\?|#|$)|\.7z(\?|#|$)|\.iso(\?|#|$))/i;

// Embed/streaming hosts that should render inside an iframe.
const IFRAME_HINT = /(youtube|youtu\.be|vimeo|dailymotion|ok\.ru|streamtape|streamsb|streamwish|dood|filemoon|mp4upload|vidhide|vidguard|voe\.sx|uqload|yourupload|mixdrop|sendvid|embedly|blogger|drive\.google\.com\/file|\/embed|\/player|streaming)/i;

export function detectStreamKind(link: string, kind?: StreamKind): StreamKind {
  if (kind) return kind;
  if (!link) return "external";
  const lower = link.toLowerCase();
  const clean = lower.split("?")[0].split("#")[0];

  // Download mirrors win first — a .mp4 on a download host is NOT streamable.
  if (DOWNLOAD_HINT.test(lower)) return "download";

  if (clean.endsWith(".m3u8") || lower.includes(".m3u8")) return "hls";
  if (clean.endsWith(".mpd")) return "hls"; // dash; hls.js path will still try, fallback handles it
  if (/\.(mp4|webm|ogg|mov|m4v)$/.test(clean)) return "video";
  if (IFRAME_HINT.test(lower)) return "iframe";

  // Bare archive / unknown binary → treat as download, not playable.
  if (/\.(mkv|zip|rar|7z|iso)$/.test(clean)) return "download";
  return "external";
}

export function isPlayableKind(kind: StreamKind) {
  return kind === "video" || kind === "hls" || kind === "iframe";
}

export function isDownloadKind(kind: StreamKind) {
  return kind === "download";
}
