import Link from "next/link";
import { Clapperboard, Users } from "lucide-react";
import { anilistDetail, anilistTitle, anilistToCard, type AniListMedia } from "@/lib/anilist";
import { AnimeCardView } from "@/components/anime-card";
import { PosterImage } from "@/components/poster-image";

/**
 * Server component: enriches a detail page with AniList metadata —
 * YouTube trailer, main characters + seiyuu, franchise relations, and
 * recommendations. Renders nothing when AniList has no match.
 */
export async function AnimeExtras({ title }: { title?: string }) {
  if (!title?.trim()) return null;
  const media = await anilistDetail({ search: title }).catch(() => undefined);
  if (!media) return null;

  const trailer = media.trailer?.site === "youtube" && media.trailer.id ? media.trailer.id : undefined;
  const characters = (media.characters?.edges ?? []).filter((edge) => edge.node?.name?.full).slice(0, 12);
  const relations = (media.relations?.edges ?? [])
    .filter((edge) => edge.node && ["PREQUEL", "SEQUEL", "SIDE_STORY", "ALTERNATIVE", "SPIN_OFF", "PARENT", "SUMMARY"].includes(edge.relationType ?? ""))
    .slice(0, 8);
  const recommendations = (media.recommendations?.nodes ?? [])
    .map((node) => node.mediaRecommendation)
    .filter((item): item is AniListMedia => !!item)
    .slice(0, 12);

  if (!trailer && !characters.length && !relations.length && !recommendations.length) return null;

  return <div className="mx-auto max-w-7xl space-y-10 px-4 pt-12 sm:px-5">
    {trailer ? <section>
      <SectionTitle icon={<Clapperboard className="size-5 text-sky-300" />} kicker="Trailer" title="Tonton trailer" />
      <div className="glass-card overflow-hidden rounded-[1.6rem] p-2 sm:rounded-[2rem] sm:p-3">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${trailer}`}
          title={`Trailer ${anilistTitle(media)}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="aspect-video w-full rounded-[1.15rem] bg-black sm:rounded-[1.5rem]"
        />
      </div>
    </section> : null}

    {characters.length ? <section>
      <SectionTitle icon={<Users className="size-5 text-sky-300" />} kicker="Karakter" title="Karakter & Seiyuu" />
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {characters.map((edge, index) => {
          const character = edge.node!;
          const va = edge.voiceActors?.[0];
          return <div key={`${character.name?.full}-${index}`} className="glass-card w-40 shrink-0 snap-start overflow-hidden rounded-2xl">
            <div className="relative aspect-[3/4] bg-slate-950">
              <PosterImage src={character.image?.large} alt={character.name?.full ?? "Karakter"} className="size-full object-cover" />
            </div>
            <div className="p-2.5">
              <p className="truncate text-xs font-bold text-white">{character.name?.full}</p>
              <p className="truncate text-[10px] text-white/40">{edge.role === "MAIN" ? "Utama" : "Pendukung"}{va?.name?.full ? ` · CV ${va.name.full}` : ""}</p>
            </div>
          </div>;
        })}
      </div>
    </section> : null}

    {relations.length ? <section>
      <SectionTitle kicker="Franchise" title="Anime terkait" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-8">
        {relations.map((edge, index) => {
          const node = edge.node!;
          const card = anilistToCard(node);
          return <Link key={`${node.id}-${index}`} href={`/search?q=${encodeURIComponent(anilistTitle(node))}`} className="group overflow-hidden rounded-2xl border border-sky-300/15 bg-[#050b14] transition hover:-translate-y-1 hover:border-sky-300/40">
            <div className="relative aspect-[2/3] bg-slate-950">
              <PosterImage src={card.poster} alt={card.title} className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
              <span className="absolute left-1.5 top-1.5 rounded-full bg-sky-500/90 px-2 py-0.5 text-[9px] font-black text-white">{relationLabel(edge.relationType)}</span>
            </div>
            <p className="line-clamp-2 p-2 text-[11px] font-bold leading-snug text-white group-hover:text-sky-300">{card.title}</p>
          </Link>;
        })}
      </div>
    </section> : null}

    {recommendations.length ? <section>
      <SectionTitle kicker="Rekomendasi" title="Kamu mungkin suka" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
        {recommendations.map((item) => <AnimeCardView key={item.id} card={anilistToCard(item)} />)}
      </div>
    </section> : null}
  </div>;
}

function relationLabel(type?: string) {
  const map: Record<string, string> = {
    PREQUEL: "Prequel", SEQUEL: "Sequel", SIDE_STORY: "Side Story",
    ALTERNATIVE: "Alternatif", SPIN_OFF: "Spin-off", PARENT: "Induk", SUMMARY: "Ringkasan",
  };
  return map[type ?? ""] ?? "Terkait";
}

function SectionTitle({ icon, kicker, title }: { icon?: React.ReactNode; kicker: string; title: string }) {
  return <div className="mb-4 flex items-center gap-2">
    {icon}
    <div>
      <p className="text-[11px] font-black uppercase tracking-[.28em] text-sky-300">{kicker}</p>
      <h2 className="text-xl font-black text-white sm:text-2xl">{title}</h2>
    </div>
  </div>;
}
