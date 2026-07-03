"use client";

import Hls from "hls.js";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { AlertTriangle, Download, ExternalLink, FastForward, Play, RotateCcw, Server, SkipForward } from "lucide-react";
import { detectStreamKind, isDownloadKind } from "@/lib/stream-kind";
import { hideSourceText } from "@/lib/sources";
import { useHydrated } from "@/store/use-hydrated";
import { useHistory, historyId } from "@/store/history";
import { usePlayerSettings } from "@/store/player-settings";
import type { SkipInterval } from "@/lib/aniskip";
import { skipLabel } from "@/lib/aniskip";

export interface WatchStream {
  quality: string;
  label: string;
  link: string;
  size?: number;
  kind?: "video" | "hls" | "iframe" | "external" | "download";
}

export interface WatchMeta {
  source?: string;
  episodeId?: string;
  /** Series title used to resolve MAL id for AniSkip. */
  seriesTitle?: string;
  /** Episode number (for AniSkip + auto-next label). */
  episodeNumber?: number;
  /** Href of the next episode; enables auto-next + tombol lanjut. */
  nextHref?: string;
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

export function WatchPlayer({ streams, downloads = [], meta = {} }: { streams: WatchStream[]; downloads?: WatchStream[]; meta?: WatchMeta }) {
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
      <PlayerSurface stream={active} label={visibleLabel(active, activeIndex)} onError={failActive} meta={meta} />
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
        <div className="flex flex-wrap items-center gap-2">
          <PlayerToggles hasNext={!!meta.nextHref} />
          <span className="rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1 text-xs font-bold text-sky-100">Aktif: {hideSourceText(active.quality) ?? active.quality}</span>
        </div>
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

function PlayerToggles({ hasNext }: { hasNext: boolean }) {
  const hydrated = useHydrated();
  const autoNext = usePlayerSettings((state) => state.autoNext);
  const autoSkipIntro = usePlayerSettings((state) => state.autoSkipIntro);
  const setAutoNext = usePlayerSettings((state) => state.setAutoNext);
  const setAutoSkipIntro = usePlayerSettings((state) => state.setAutoSkipIntro);
  if (!hydrated) return null;
  return <>
    {hasNext ? <TogglePill active={autoNext} onClick={() => setAutoNext(!autoNext)} label="Auto next" /> : null}
    <TogglePill active={autoSkipIntro} onClick={() => setAutoSkipIntro(!autoSkipIntro)} label="Auto skip intro" />
  </>;
}

function TogglePill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition ${active ? "border-sky-300/50 bg-sky-400/20 text-sky-100" : "border-white/10 bg-white/[.045] text-white/50 hover:text-white/80"}`}
  >
    <span className={`size-1.5 rounded-full ${active ? "bg-sky-300" : "bg-white/30"}`} />{label}
  </button>;
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

function PlayerSurface({ stream, label, onError, meta }: { stream: WatchStream; label: string; onError: (link: string, message: string) => void; meta: WatchMeta }) {
  const kind = detectStreamKind(stream.link, stream.kind);

  if (kind === "iframe") {
    return <IframePlayer src={stream.link} label={label} onError={(message) => onError(stream.link, message)} meta={meta} />;
  }

  if (kind === "external" || kind === "download") {
    return <div className="grid aspect-video place-items-center rounded-[1.15rem] bg-black text-center text-white/70 sm:rounded-[1.5rem]">
      <div className="space-y-3">
        <p className="font-bold">Server ini hanya bisa dibuka langsung.</p>
        <a href={stream.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950"><ExternalLink className="size-4" />Buka server</a>
      </div>
    </div>;
  }

  return <NativeVideoPlayer src={stream.link} kind={kind} onError={(message) => onError(stream.link, message)} meta={meta} />;
}

// Iframe embeds sometimes fire spurious onError or reload; debounce so a single
// transient blip doesn't flip the whole player into the error state (the "kedip").
function IframePlayer({ src, label, onError, meta }: { src: string; label: string; onError: (message: string) => void; meta: WatchMeta }) {
  const [loaded, setLoaded] = useState(false);
  const onErrorRef = useRef(onError);
  const router = useRouter();

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
    {meta.nextHref ? <button
      type="button"
      onClick={() => router.push(meta.nextHref!)}
      className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/70 px-3 py-1.5 text-xs font-black text-white/85 backdrop-blur transition hover:bg-sky-500/80"
    ><SkipForward className="size-3.5" />Episode berikutnya</button> : null}
  </div>;
}

/** Fetch AniSkip OP/ED intervals lazily once the duration is known. */
function useSkipTimes(meta: WatchMeta, durationSec: number) {
  const [intervals, setIntervals] = useState<SkipInterval[]>([]);
  const requested = useRef("");

  useEffect(() => {
    if (!meta.seriesTitle || !meta.episodeNumber || durationSec < 60) return;
    const key = `${meta.seriesTitle}:${meta.episodeNumber}`;
    if (requested.current === key) return;
    requested.current = key;
    const controller = new AbortController();
    fetch(`/api/skip-times?title=${encodeURIComponent(meta.seriesTitle)}&episode=${meta.episodeNumber}&length=${Math.round(durationSec)}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((json: { intervals?: SkipInterval[] }) => setIntervals(json.intervals ?? []))
      .catch(() => {});
    return () => controller.abort();
  }, [meta.seriesTitle, meta.episodeNumber, durationSec]);

  return intervals;
}

function NativeVideoPlayer({ src, kind, onError, meta }: { src: string; kind?: WatchStream["kind"]; onError: (message: string) => void; meta: WatchMeta }) {
  const hydrated = useHydrated();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  // Keep the latest onError without making it an effect dependency, so the HLS
  // instance is built exactly once per src and never torn down on parent re-render.
  const onErrorRef = useRef(onError);
  const armedAtRef = useRef(0);
  const resumedRef = useRef(false);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [levels, setLevels] = useState<Array<{ index: number; height: number }>>([]);
  const [activeLevel, setActiveLevel] = useState(-1);
  const [ended, setEnded] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const watchId = meta.source && meta.episodeId ? historyId(meta.source, meta.episodeId) : undefined;
  const updateProgress = useHistory((state) => state.updateProgress);
  const savedProgress = useHistory((state) => (watchId ? state.items[watchId]?.progressSec : undefined));
  const settings = usePlayerSettings();
  const intervals = useSkipTimes(meta, duration);

  const activeInterval = useMemo(() => {
    if (!intervals.length || !currentTime) return undefined;
    return intervals.find((item) => currentTime >= item.startTime && currentTime < item.endTime - 1);
  }, [intervals, currentTime]);

  const doSkip = useCallback((interval: SkipInterval) => {
    const video = videoRef.current;
    if (video) video.currentTime = interval.endTime;
  }, []);

  // Auto-skip intro when enabled.
  useEffect(() => {
    if (settings.autoSkipIntro && activeInterval) doSkip(activeInterval);
  }, [settings.autoSkipIntro, activeInterval, doSkip]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Reset resume flag when episode changes.
  useEffect(() => {
    resumedRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset transient UI state for new media source.
    setEnded(false);
    setCountdown(0);
  }, [src, watchId]);

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
    hlsRef.current = hls;
    let networkRetries = 0;
    let mediaRetries = 0;
    hls.loadSource(src);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      const parsed = hls.levels
        .map((level, index) => ({ index, height: level.height || 0 }))
        .filter((level) => level.height > 0);
      setLevels(parsed.length > 1 ? parsed.sort((a, b) => b.height - a.height) : []);
      setActiveLevel(-1);
    });
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
      hlsRef.current = null;
      setLevels([]);
      video.removeAttribute("src");
      video.load();
    };
  }, [hydrated, kind, src]);

  // Keyboard shortcuts (document-level; skip when typing in an input).
  useEffect(() => {
    if (!hydrated) return;
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      const video = videoRef.current;
      if (!video) return;
      const key = event.key.toLowerCase();
      if (key === " " || key === "k") {
        event.preventDefault();
        if (video.paused) void video.play(); else video.pause();
      } else if (key === "arrowleft" || key === "j") {
        event.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 10);
      } else if (key === "arrowright" || key === "l") {
        event.preventDefault();
        video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 10);
      } else if (key === "f") {
        event.preventDefault();
        const container = video.closest("media-controller");
        if (document.fullscreenElement) void document.exitFullscreen();
        else void (container ?? video).requestFullscreen?.();
      } else if (key === "m") {
        event.preventDefault();
        video.muted = !video.muted;
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [hydrated]);

  // Auto-next countdown after the episode ends.
  useEffect(() => {
    if (!ended || !settings.autoNext || !meta.nextHref) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- start visible auto-next countdown when ended flips true.
    setCountdown(5);
    const interval = window.setInterval(() => {
      setCountdown((value) => {
        if (value <= 1) {
          window.clearInterval(interval);
          router.push(meta.nextHref!);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [ended, settings.autoNext, meta.nextHref, router]);

  const selectLevel = (index: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.currentLevel = index;
    setActiveLevel(index);
  };

  if (!hydrated) {
    return <div className="grid aspect-video w-full place-items-center overflow-hidden rounded-[1.15rem] bg-black shadow-[0_24px_80px_rgba(0,0,0,.55)] sm:rounded-[1.5rem]"><span className="size-9 animate-spin rounded-full border-2 border-white/20 border-t-sky-400" /></div>;
  }

  return <div className="relative">
    <MediaController className="aspect-video w-full overflow-hidden rounded-[1.15rem] bg-black shadow-[0_24px_80px_rgba(0,0,0,.55)] sm:rounded-[1.5rem]">
      <video
        ref={videoRef}
        slot="media"
        playsInline
        preload="metadata"
        className="h-full w-full bg-black"
        onLoadedMetadata={(event) => {
          const video = event.currentTarget;
          // Apply persisted preferences.
          video.volume = settings.volume;
          video.muted = settings.muted;
          video.playbackRate = settings.rate;
          setDuration(video.duration || 0);
          // Resume: only once per episode, only when meaningful (>15s in, <92% done).
          if (!resumedRef.current && savedProgress && video.duration && savedProgress > 15 && savedProgress < video.duration * 0.92) {
            video.currentTime = savedProgress;
          }
          resumedRef.current = true;
        }}
        onTimeUpdate={(event) => {
          const video = event.currentTarget;
          const time = video.currentTime;
          setCurrentTime(time);
          // Persist progress at most every ~5s of playback.
          if (watchId && video.duration && Math.abs(time - (savedProgress ?? 0)) > 5) {
            updateProgress(watchId, Math.floor(time), Math.floor(video.duration));
          }
        }}
        onVolumeChange={(event) => {
          const video = event.currentTarget;
          settings.setVolume(video.volume);
          settings.setMuted(video.muted);
        }}
        onRateChange={(event) => settings.setRate(event.currentTarget.playbackRate)}
        onEnded={() => {
          if (watchId && duration) updateProgress(watchId, Math.floor(duration), Math.floor(duration));
          setEnded(true);
        }}
        onPlay={() => setEnded(false)}
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
    </MediaController>

    {/* Skip intro/outro overlay */}
    {activeInterval && !settings.autoSkipIntro ? <button
      type="button"
      onClick={() => doSkip(activeInterval)}
      className="absolute bottom-16 right-4 z-10 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/75 px-4 py-2 text-sm font-black text-white backdrop-blur transition hover:bg-sky-500/85"
    ><FastForward className="size-4" />{skipLabel(activeInterval.type)}</button> : null}

    {/* Auto-next overlay */}
    {ended && meta.nextHref ? <div className="absolute inset-0 z-10 grid place-items-center rounded-[1.15rem] bg-black/75 backdrop-blur-sm sm:rounded-[1.5rem]">
      <div className="text-center">
        <p className="text-sm font-bold text-white/60">Episode selesai</p>
        <button
          type="button"
          onClick={() => router.push(meta.nextHref!)}
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-sky-400 px-5 py-2.5 text-sm font-black text-slate-950 transition hover:bg-sky-300"
        ><SkipForward className="size-4" />{settings.autoNext && countdown > 0 ? `Episode berikutnya (${countdown})` : "Episode berikutnya"}</button>
        {settings.autoNext && countdown > 0 ? <button type="button" onClick={() => { settings.setAutoNext(false); setCountdown(0); }} className="mt-3 block w-full text-xs font-bold text-white/40 hover:text-white/70">Batalkan auto-next</button> : null}
      </div>
    </div> : null}

    {/* HLS quality selector */}
    {levels.length ? <div className="mt-2 flex flex-wrap items-center gap-1.5 px-1">
      <span className="text-[11px] font-black uppercase tracking-wider text-white/35">Kualitas</span>
      <button
        type="button"
        onClick={() => selectLevel(-1)}
        className={`rounded-full border px-2.5 py-1 text-[11px] font-black transition ${activeLevel === -1 ? "border-sky-300/60 bg-sky-400/20 text-sky-100" : "border-white/10 bg-white/[.045] text-white/55 hover:text-white"}`}
      >Auto</button>
      {levels.map((level) => <button
        key={level.index}
        type="button"
        onClick={() => selectLevel(level.index)}
        className={`rounded-full border px-2.5 py-1 text-[11px] font-black transition ${activeLevel === level.index ? "border-sky-300/60 bg-sky-400/20 text-sky-100" : "border-white/10 bg-white/[.045] text-white/55 hover:text-white"}`}
      >{level.height}p</button>)}
    </div> : null}
  </div>;
}
