"use client";

import { useMemo, useState } from "react";
import { imageProxy } from "@/lib/images";
import { looksLowQuality } from "@/lib/media-art";

interface PosterImageProps {
  src?: string;
  sources?: Array<string | undefined>;
  alt: string;
  className?: string;
  priority?: boolean;
}

export function PosterImage({ src, sources = [], alt, className, priority = false }: PosterImageProps) {
  const candidates = useMemo(() => [src, ...sources]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .sort((a, b) => Number(looksLowQuality(a)) - Number(looksLowQuality(b))), [src, sources]);
  const signature = candidates.join("|");
  const [state, setState] = useState({ signature, index: 0 });
  const index = state.signature === signature ? state.index : 0;

  const active = candidates[index];
  if (!active) {
    return <ImagePlaceholder alt={alt} className={className} />;
  }

  // eslint-disable-next-line @next/next/no-img-element -- poster domains are dynamic; proxy + native fallback is more reliable than next/image allowlists here.
  return <img
    key={active}
    src={imageProxy(active) ?? ""}
    alt={alt}
    loading="eager"
    fetchPriority={priority ? "high" : "auto"}
    decoding="async"
    className={className}
    onError={() => setState({ signature, index: index + 1 })}
    onLoad={(event) => {
      const image = event.currentTarget;
      if (!image.naturalWidth) setState({ signature, index: index + 1 });
    }}
  />;
}

function ImagePlaceholder({ alt, className }: { alt: string; className?: string }) {
  const initial = alt.trim().charAt(0).toUpperCase() || "Z";
  return <div className={`${className ?? ""} relative grid place-items-center overflow-hidden bg-gradient-to-br from-[#06203a] via-[#075985] to-[#020617] text-4xl font-black text-sky-50`} role="img" aria-label={alt}>
    <div className="absolute inset-0 opacity-80 [background:radial-gradient(circle_at_28%_18%,rgba(125,211,252,.48),transparent_32%),radial-gradient(circle_at_78%_72%,rgba(29,78,216,.44),transparent_34%),linear-gradient(135deg,rgba(255,255,255,.12)_0_1px,transparent_1px_12px)]" />
    <div className="relative grid size-20 place-items-center rounded-3xl border border-sky-200/30 bg-black/30 shadow-[0_0_48px_rgba(56,189,248,.38)] backdrop-blur">
      <span className="drop-shadow-[0_0_24px_rgba(56,189,248,.75)]">{initial}</span>
    </div>
    <span className="absolute bottom-4 left-4 right-4 line-clamp-2 text-center text-[10px] font-black uppercase tracking-[.18em] text-sky-100/85">ZXLIX</span>
  </div>;
}
