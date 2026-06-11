"use client";

import Image from "next/image";
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

  return <Image
    key={active}
    src={imageProxy(active) ?? ""}
    alt={alt}
    width={720}
    height={1080}
    unoptimized
    priority={priority}
    className={className}
    onError={() => setState({ signature, index: index + 1 })}
  />;
}

function ImagePlaceholder({ alt, className }: { alt: string; className?: string }) {
  const initial = alt.trim().charAt(0).toUpperCase() || "Z";
  return <div className={`${className ?? ""} relative grid place-items-center overflow-hidden bg-gradient-to-br from-[#06111f] via-sky-950 to-blue-950 text-4xl font-black text-sky-100`} role="img" aria-label={alt}>
    <div className="absolute inset-0 opacity-45 [background:radial-gradient(circle_at_30%_20%,rgba(56,189,248,.35),transparent_35%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,.28),transparent_32%),linear-gradient(135deg,rgba(255,255,255,.08)_0_1px,transparent_1px_12px)]" />
    <div className="relative grid size-16 place-items-center rounded-2xl border border-sky-300/20 bg-black/25 shadow-[0_0_34px_rgba(56,189,248,.22)] backdrop-blur">
      <span className="drop-shadow-[0_0_24px_rgba(56,189,248,.55)]">{initial}</span>
    </div>
  </div>;
}
