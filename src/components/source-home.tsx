import { RailSection } from "@/components/section";
import { ContinueWatching } from "@/components/continue-watching";
import { sourceHome } from "@/lib/unified-catalog";
import { type CatalogSourceId } from "@/lib/sources";
import type { DisplayCard } from "@/components/anime-card";
import { HomeHeroSlider } from "@/components/home-hero-slider";
import { enrichMissingPosters } from "@/lib/media-art";

function joinBase(base: string, path = "") {
  if (!path) return base || "/";
  return `${base === "/" ? "" : base}${path}`;
}

export async function SourceHome({ source }: { source: CatalogSourceId }) {
  const data = await sourceHome(source);
  const [latestCards, ongoingCards, recCards, movieCards] = await Promise.all([
    enrichMissingPosters(data.latest.slice(0, 12), 8, 3),
    enrichMissingPosters(data.ongoing.slice(0, 12), 8, 2),
    enrichMissingPosters(data.popular.slice(0, 12), 8, 4),
    enrichMissingPosters(data.movies.slice(0, 12), 10, 4),
  ]);
  const base = source === "all" ? "/" : `/s/${source}`;
  const slides = [...recCards, ...latestCards, ...movieCards].filter(Boolean).slice(0, 10) as DisplayCard[];

  return <main className="idlix-home min-h-screen overflow-hidden bg-[#030711] pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-16">
    <HomeHeroSlider slides={slides} base={base} />
    <div className="relative z-10 bg-[#030711] pt-3">
      <ContinueWatching />
      <RailSection title="Episode Terbaru" subtitle="Update cepat dari katalog aktif." cards={latestCards} href={joinBase(base, "/latest")} />
      <RailSection title="TV Series" subtitle="Series berjalan minggu ini." cards={ongoingCards} href={joinBase(base, "/ongoing")} />
      <RailSection title="Rekomendasi" subtitle="Pilihan populer buat watchlist." cards={recCards} href={joinBase(base, "/popular")} />
      <RailSection title="Movies" subtitle="Film pilihan untuk maraton singkat." cards={movieCards} href={joinBase(base, "/movies")} />
    </div>
  </main>;
}
