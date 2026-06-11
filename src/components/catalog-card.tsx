import Link from "next/link";
import type { CardItem } from "@/lib/catalog";
import { PosterImage } from "@/components/poster-image";
import { hideSourceText } from "@/lib/sources";

export function CatalogCard({ item }: { item: CardItem }) {
  const badge = item.score ? `★ ${item.score}` : hideSourceText(item.badge) ?? "HD";
  const meta = hideSourceText(item.meta) || (item.totalEpisode ? `${item.totalEpisode} Episode` : "Judul");
  const genres = item.genres.map((genre) => hideSourceText(genre)).filter(Boolean).slice(0, 2);
  return <Link href={`/anime/${item.slug}`} className="poster-card group block overflow-hidden rounded-3xl border border-sky-300/15 bg-[#050b14]/85 shadow-xl shadow-black/20 transition duration-300 hover:-translate-y-2 hover:border-sky-300/50">
    <div className="relative aspect-[2/3] overflow-hidden bg-gradient-to-br from-blue-950 to-slate-950">
      <PosterImage src={item.poster} alt={item.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent opacity-90" />
      <div className="absolute left-3 top-3 rounded-full bg-sky-500 px-3 py-1 text-xs font-bold shadow-lg shadow-sky-500/30">{badge}</div>
      <div className="absolute inset-x-3 bottom-3 translate-y-4 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100"><span className="inline-flex rounded-full bg-white px-4 py-2 text-xs font-black text-slate-950">▶ Detail</span></div>
    </div>
    <div className="space-y-2 p-4">
      <h3 className="line-clamp-2 font-bold leading-snug text-white">{item.title}</h3>
      <p className="text-xs text-white/45">{meta}</p>
      {genres.length ? <div className="flex flex-wrap gap-1">{genres.map((genre) => <span key={genre} className="rounded-full bg-sky-500/10 px-2 py-1 text-[10px] text-sky-200">{genre}</span>)}</div> : null}
    </div>
  </Link>;
}
