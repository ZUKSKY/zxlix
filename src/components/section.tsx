import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AnimeCardView, type DisplayCard } from "./anime-card";

export function RailSection({ title, subtitle, cards, href }: { title: string; subtitle?: string; cards: DisplayCard[]; href?: string }) {
  return <section className="mx-auto max-w-7xl px-4 py-8 sm:px-5 sm:py-10">
    <div className="pointer-events-none mb-7 h-px w-full bg-gradient-to-r from-transparent via-sky-300/20 to-transparent" />
    <div className="mb-5 flex items-end justify-between gap-4 sm:mb-6">
      <div>
        <p className="mb-2 text-[11px] font-black uppercase tracking-[.28em] text-sky-300">Koleksi</p>
        <h2 className="text-2xl font-black text-white md:text-3xl">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-white/50">{subtitle}</p> : null}
      </div>
      {href ? <Link href={href} className="hidden items-center gap-2 rounded-full border border-sky-300/20 bg-sky-400/10 px-4 py-2 text-sm font-bold text-sky-100 transition hover:bg-sky-400/20 sm:inline-flex">Lihat semua <ArrowRight className="size-4" /></Link> : null}
    </div>
    {cards.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
      {cards.map((card, index) => <AnimeCardView key={`${card.title}-${index}`} card={card} />)}
    </div> : <div className="glass-card rounded-3xl p-6 text-sm font-bold text-white/55">Data belum tersedia.</div>}
  </section>;
}
