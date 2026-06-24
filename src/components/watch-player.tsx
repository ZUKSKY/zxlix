"use client";

import Hls from "hls.js";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MediaController,
  MediaControlBar,
  MediaPlayButton,
  MediaSeekBackwardButton,
  MediaSeekForwardButton,
  MediaTimeRange,
  MediaTimeDisplay,
  MediaMuteButton,
  MediaVolumeRange,
  MediaPlaybackRateButton,
  MediaFullscreenButton,
  MediaPipButton,
  MediaLoadingIndicator,
} from "media-chrome/react";
import { AlertTriangle, Download, ExternalLink, Play, RotateCcw, Server } from "lucide-react";
import { detectStreamKind, isDownloadKind } from "@/lib/stream-kind";
import { hideSourceText } from "@/lib/sources";
import { useHydrated } from "@/store/use-hydrated";

export interface WatchStream {
  quality: string;
  label: string;
  link: string;
  size?: number;
  kind?: "video" | "hls" | "iframe" | "external" | "download";
}

function classify(stream: WatchStream) {
  return detectStreamKind(stream.link, stream.kind);
}

function sortStreams(streams: WatchStream[]) {
  const order: Record<string, number> = { iframe: 0, hls: 1, video: 2, external: 3, download: 4 };
  return [...streams]
    .filter((stream) => stream.link)
    .sort((a, b) => (order[classify(a)] ?? 9) - (order[classify(b)] ?? 9));
}

function visibleLabel(stream: WatchStream, index = 0) {
  return hideSourceText(stream.label) ?? `Server ${index + 1}`;
}

export function WatchPlayer({ streams, downloads = [] }: { streams: WatchStream[]; downloads?: WatchStream[] }) {
  // Anything detected as a download is moved out of the playable list automatically,
  // so a download-mirror link can never hijack the player into a file download.
  const { playable, extraDownloads } = useMemo(() => {
    const sorted = sortStreams(streams);
    return {
      playable: sorted.filter((stream) => !isDownloadKind(classify(stream))),
      extraDownloads: sorted.filter((stream) => isDownloadKind(classify(stream))),
    };
  }, [streams]);

  const allDownloads = useMemo(() => [...downloads, ...extraDownloads].filter((item) => item.link), [downloads, extraDownloads]);

  const [selectedLink, setSelectedLink] = useState<string | undefined>();
  const [error, setError] = useState<string>("");
  const [failed, setFailed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!playable.length) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync selected server with newly fetched stream list.
    setSelectedLink((current) => current && playable.some((stream) => stream.link === current) ? current : playable[0]?.link);
    setFailed(new Set());
    setError("");
  }, [playable]);

  if (!playable.length) {
    return (
      <div className="space-y-5">
        <div className="glass-card grid aspect-video place-items-center rounded-[1.5rem] text-center text-white/60">
          <div>
            <Server className="mx-auto mb-3 size-10 text-sky-300/70" />
            <p className="font-bold">Stream belum tersedia.</p>
            <p className="mt-1 text-sm text-white/40">Coba episode lain atau unduh dari mirror di bawah.</p>
          </div>
        </div>
        {allDownloads.length ? <DownloadSection downloads={allDownloads} /> : null}
      </div>
    );
  }

  const active = playable.find((stream) => stream.link === selectedLink) ?? playable.find((stream) => !failed.has(stream.link)) ?? playable[0];
  const activeIndex = playable.findIndex((stream) => stream.link === active.link);
  const choose = (link: string) => {
    setSelectedLink(link);
    setError("");
    setFailed((prev) => {
      if (!prev.has(link)) return prev;
      const next = new Set(prev);
      next.delete(link);
      return next;
    });
  };
  const nextServer = () => {
    const next = playable.slice(activeIndex + 1).find((stream) => !failed.has(stream.link)) ?? playable.find((stream) => !failed.has(stream.link)) ?? playable[(activeIndex + 1) % playable.length];
    if (next) choose(next.link);
  };
  const failActive = (failedLink: string, message: string) => {
    if (failedLink !== active.link) return;
    const nextFailed = new Set(failed).add(failedLink);
    const next = playable.slice(activeIndex + 1).find((stream) => !nextFailed.has(stream.link)) ?? playable.find((stream) => !nextFailed.has(stream.link));
    setFailed(nextFailed);
    setError(message);
    if (next) setSelectedLink(next.link);
  };

  return <div className="space-y-5">
    <div className="glass-card overflow-hidden rounded-[1.6rem] p-2 sm:rounded-[2rem] sm:p-3">
      <PlayerSurface stream={active} label={visibleLabel(active, activeIndex)} onError={failActive} />
      {error ? <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
        <span className="inline-flex items-center gap-2"><AlertTriangle className="size-4" />{error}</span>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={nextServer} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-950"><RotateCcw className="size-3" />Coba server lain</button>
          {failed.size ? <button type="button" onClick={() => { setFailed(new Set()); setError(""); }} className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-black text-white/80">Reset</button> : null}
        </div>
      </div> : null}
    </div>

    <div className="glass-card rounded-[1.6rem] p-4 sm:rounded-[2rem] sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-sky-300">Server streaming</p>
          <h2 className="mt-1 text-xl font-black text-white">Pilih server</h2>
        </div>
        <span className="rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1 text-xs font-bold text-sky-100">Aktif: {hideSourceText(active.quality) ?? active.quality}</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {playable.map((stream, index) => {
          const isActive = stream.link === active.link;
          const isFailed = failed.has(stream.link);
          return <button
            key={`${stream.quality}-${stream.label}-${stream.link}`}
            type="button"
            onClick={() => choose(stream.link)}
            className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${isActive
              ? "border-sky-300/60 bg-sky-400/18 text-white shadow-[0_0_28px_rgba(14,165,233,.18)]"
              : "border-white/10 bg-white/[.045] text-white/72 hover:border-sky-300/35 hover:bg-sky-500/10 hover:text-white"
            } ${isFailed ? "opacity-55" : ""}`}
          >
            <span className="inline-flex items-center gap-2"><Play className={`size-4 ${isActive ? "fill-sky-200 text-sky-200" : "text-sky-300/70"}`} />{visibleLabel(stream, index)}</span>
            {stream.size ? <span className="text-xs text-white/45">{Math.round(stream.size / 1024)} MB</span> : null}
          </button>;
        })}
      </div>
    </div>

    {allDownloads.length ? <DownloadSection downloads={allDownloads} /> : null}
  </div>;
}

function DownloadSection({ downloads }: { downloads: WatchStream[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, WatchStream[]>();
    for (const item of downloads) {
      const key = hideSourceText(item.quality) ?? item.quality ?? "Unduh";
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [downloads]);

  return <div className="glass-card rounded-[1.6rem] p-4 sm:rounded-[2rem] sm:p-5">
    <div className="mb-4 flex items-center gap-2">
      <Download className="size-5 text-sky-300" />
      <div>
        <p className="text-xs font-black uppercase tracking-[.22em] text-sky-300">Unduh</p>
        <h2 className="mt-0.5 text-lg font-black text-white">Download episode</h2>
      </div>
    </div>
    <div className="space-y-3">
      {groups.map(([quality, items]) => <div key={quality} className="flex flex-wrap items-center gap-2">
        <span className="min-w-16 rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1 text-xs font-black text-sky-100">{quality}</span>
        {items.map((item, index) => <a
          key={`${item.link}-${index}`}
          href={item.link}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[.045] px-3 py-1.5 text-xs font-bold text-white/75 transition hover:border-sky-300/35 hover:bg-sky-500/10 hover:text-white"
        ><Download className="size-3.5 text-sky-300/80" />{hideSourceText(item.label) ?? `Mirror ${index + 1}`}</a>)}
      </div>)}
    </div>
  </div>;
}

function PlayerSurface({ stream, label, onError }: { stream: WatchStream; label: string; onError: (link: string, message: string) => void }) {
  const kind = detectStreamKind(stream.link, stream.kind);

  if (kind === "iframe") {
    return <IframePlayer src={stream.link} label={label} onError={(message) => onError(stream.link, message)} />;
  }

  if (kind === "external" || kind === "download") {
    return <div className="grid aspect-video place-items-center rounded-[1.15rem] bg-black text-center text-white/70 sm:rounded-[1.5rem]">
      <div className="space-y-3">
        <p className="font-bold">Server ini hanya bisa dibuka langsung.</p>
        <a href={stream.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950"><ExternalLink className="size-4" />Buka server</a>
      </div>
    </div>;
  }

  return <NativeVideoPlayer src={stream.link} kind={kind} onError={(message) => onError(stream.link, message)} />;
}

// Iframe embeds sometimes fire spurious onError or reload; debounce so a single
// transient blip doesn't flip the whole player into the error state (the "kedip").
function IframePlayer({ src, label, onError }: { src: string; label: string; onError: (message: string) => void }) {
  const [loaded, setLoaded] = useState(false);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset iframe loader when src changes.
    setLoaded(false);
    const timer = window.setTimeout(() => {
      setLoaded((value) => {
        if (!value) onErrorRef.current("Embed server terlalu lama dimuat. Coba server lain.");
        return value;
      });
    }, 12000);
    return () => window.clearTimeout(timer);
  }, [src]);

  return <div className="relative aspect-video w-full overflow-hidden rounded-[1.15rem] bg-black shadow-[0_24px_80px_rgba(0,0,0,.55)] sm:rounded-[1.5rem]">
    {!loaded ? <div className="absolute inset-0 grid place-items-center"><span className="size-9 animate-spin rounded-full border-2 border-white/20 border-t-sky-400" /></div> : null}
    <iframe
      src={src}
      title={label}
      allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
      allowFullScreen
      referrerPolicy="no-referrer"
      className="size-full"
      onLoad={() => setLoaded(true)}
    />
  </div>;
}

function NativeVideoPlayer({ src, kind, onError }: { src: string; kind?: WatchStream["kind"]; onError: (message: string) => void }) {
  const hydrated = useHydrated();
  const videoRef = useRef<HTMLVideoElement>(null);
  // Keep the latest onError without making it an effect dependency, so the HLS
  // instance is built exactly once per src and never torn down on parent re-render.
  const onErrorRef = useRef(onError);
  const armedAtRef = useRef(0);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!hydrated) return;
    const video = videoRef.current;
    if (!video) return;
    armedAtRef.current = Date.now() + 600;

    const isHls = kind === "hls" || /\.m3u8(\?|#|$)/i.test(src);
    if (!isHls) {
      video.src = src;
      return () => { video.removeAttribute("src"); video.load(); };
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      return () => { video.removeAttribute("src"); video.load(); };
    }

    if (!Hls.isSupported()) {
      onErrorRef.current("Browser tidak mendukung HLS. Coba server lain.");
      return;
    }

    const hls = new Hls({ enableWorker: true, lowLatencyMode: false, backBufferLength: 90 });
    let networkRetries = 0;
    let mediaRetries = 0;
    hls.loadSource(src);
    hls.attachMedia(video);
    hls.on(Hls.Events.ERROR, (_event, data) => {
      // Non-fatal errors are buffering hiccups; let hls.js self-heal instead of
      // remounting the player (the previous blink/flicker was from instant fail).
      if (!data.fatal) return;
      if (data.type === Hls.ErrorTypes.NETWORK_ERROR && networkRetries < 2) {
        networkRetries += 1;
        window.setTimeout(() => hls.startLoad(), networkRetries * 700);
        return;
      }
      if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRetries < 1) {
        mediaRetries += 1;
        hls.recoverMediaError();
        return;
      }
      hls.destroy();
      onErrorRef.current("Video gagal diputar. Coba server lain.");
    });

    return () => {
      hls.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [hydrated, kind, src]);

  if (!hydrated) {
    return <div className="grid aspect-video w-full place-items-center overflow-hidden rounded-[1.15rem] bg-black shadow-[0_24px_80px_rgba(0,0,0,.55)] sm:rounded-[1.5rem]"><span className="size-9 animate-spin rounded-full border-2 border-white/20 border-t-sky-400" /></div>;
  }

  return <MediaController className="aspect-video w-full overflow-hidden rounded-[1.15rem] bg-black shadow-[0_24px_80px_rgba(0,0,0,.55)] sm:rounded-[1.5rem]">
    <video
      ref={videoRef}
      slot="media"
      playsInline
      preload="metadata"
      className="h-full w-full bg-black"
      onError={(event) => {
        const target = event.currentTarget;
        if (Date.now() < armedAtRef.current) return;
        if (!target.currentSrc && target.networkState === HTMLMediaElement.NETWORK_EMPTY) return;
        onErrorRef.current("Video gagal diputar. Coba server lain.");
      }}
    />
    <MediaLoadingIndicator slot="centered-chrome" />
    <MediaControlBar>
      <MediaPlayButton />
      <MediaSeekBackwardButton seekOffset={10} />
      <MediaSeekForwardButton seekOffset={10} />
      <MediaTimeRange />
      <MediaTimeDisplay showDuration />
      <MediaMuteButton />
      <MediaVolumeRange />
      <MediaPlaybackRateButton />
      <MediaPipButton />
      <MediaFullscreenButton />
    </MediaControlBar>
  </MediaController>;
}
