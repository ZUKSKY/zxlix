"use client";

import Hls from "hls.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ExternalLink, Play, RotateCcw, Server } from "lucide-react";
import { detectStreamKind } from "@/lib/stream-kind";
import { hideSourceText } from "@/lib/sources";

export interface WatchStream {
  quality: string;
  label: string;
  link: string;
  size?: number;
  kind?: "video" | "hls" | "iframe" | "external";
}

function sortStreams(streams: WatchStream[]) {
  const order: Record<NonNullable<WatchStream["kind"]>, number> = { iframe: 0, hls: 1, video: 2, external: 3 };
  return [...streams]
    .filter((stream) => stream.link)
    .sort((a, b) => order[detectStreamKind(a.link, a.kind) ?? "external"] - order[detectStreamKind(b.link, b.kind) ?? "external"]);
}

function visibleLabel(stream: WatchStream, index = 0) {
  return hideSourceText(stream.label) ?? `Server ${index + 1}`;
}

export function WatchPlayer({ streams }: { streams: WatchStream[] }) {
  const validStreams = useMemo(() => sortStreams(streams), [streams]);
  const [selectedLink, setSelectedLink] = useState<string | undefined>();
  const [error, setError] = useState<string>("");
  const [failed, setFailed] = useState<Set<string>>(new Set());

  if (!validStreams.length) {
    return <div className="glass-card grid aspect-video place-items-center rounded-[1.5rem] text-center text-white/60">
      <div>
        <Server className="mx-auto mb-3 size-10 text-sky-300/70" />
        <p className="font-bold">Stream belum tersedia.</p>
        <p className="mt-1 text-sm text-white/40">Coba episode lain atau cek kembali nanti.</p>
      </div>
    </div>;
  }

  const active = validStreams.find((stream) => stream.link === selectedLink) ?? validStreams.find((stream) => !failed.has(stream.link)) ?? validStreams[0];
  const activeIndex = validStreams.findIndex((stream) => stream.link === active.link);
  const choose = (link: string) => { setSelectedLink(link); setError(""); };
  const nextServer = () => {
    const next = validStreams.slice(activeIndex + 1).find((stream) => !failed.has(stream.link)) ?? validStreams.find((stream) => !failed.has(stream.link)) ?? validStreams[(activeIndex + 1) % validStreams.length];
    choose(next.link);
  };
  const failActive = (message: string) => {
    setFailed((prev) => new Set(prev).add(active.link));
    setError(message);
    nextServer();
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
          <h2 className="mt-1 text-xl font-black text-white">Pilih kualitas</h2>
        </div>
        <span className="rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1 text-xs font-bold text-sky-100">Aktif: {active.quality}</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {validStreams.map((stream, index) => {
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
  </div>;
}

function PlayerSurface({ stream, label, onError }: { stream: WatchStream; label: string; onError: (message: string) => void }) {
  const kind = detectStreamKind(stream.link, stream.kind);
  if (kind === "iframe") {
    return <iframe
      key={stream.link}
      src={stream.link}
      title={label}
      allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
      allowFullScreen
      referrerPolicy="no-referrer"
      className="aspect-video w-full rounded-[1.15rem] bg-black shadow-[0_24px_80px_rgba(0,0,0,.55)] sm:rounded-[1.5rem]"
      onError={() => onError("Embed server gagal dimuat.")}
    />;
  }

  if (kind === "external") {
    return <div className="grid aspect-video place-items-center rounded-[1.15rem] bg-black text-center text-white/70 sm:rounded-[1.5rem]">
      <div className="space-y-3">
        <p className="font-bold">Server perlu dibuka langsung.</p>
        <a href={stream.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950"><ExternalLink className="size-4" />Buka server</a>
      </div>
    </div>;
  }

  return <NativeVideoPlayer key={stream.link} src={stream.link} kind={kind} onError={onError} />;
}

function NativeVideoPlayer({ src, kind, onError }: { src: string; kind?: "video" | "hls" | "iframe" | "external"; onError: (message: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

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
      onError("Browser tidak mendukung HLS. Coba server lain.");
      return;
    }

    const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
    hls.loadSource(src);
    hls.attachMedia(video);
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) onError("Video gagal diputar. Coba server lain.");
    });

    return () => {
      hls.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [kind, onError, src]);

  return <div className="aspect-video w-full overflow-hidden rounded-[1.15rem] bg-black shadow-[0_24px_80px_rgba(0,0,0,.55)] sm:rounded-[1.5rem]">
    <video
      ref={videoRef}
      controls
      playsInline
      preload="metadata"
      className="h-full w-full bg-black"
      onError={() => onError("Video gagal diputar. Coba server lain.")}
    />
  </div>;
}
