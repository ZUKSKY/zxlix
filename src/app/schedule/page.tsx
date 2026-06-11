import Link from "next/link";
import { CalendarDays, Clock } from "lucide-react";
import { akList } from "@/lib/animekita";
import { cleanSlug } from "@/lib/images";
import { PosterImage } from "@/components/poster-image";

type AnyObj = Record<string, unknown>;
interface ScheduleAnime { anime_name?: string; judul?: string; title?: string; link?: string; url?: string; cover?: string; updated?: number | string; id?: string | number }
interface ScheduleDay { day?: string; hari?: string; date?: string; animeList?: ScheduleAnime[]; list?: ScheduleAnime[]; items?: ScheduleAnime[] }

function normalizeSchedule(raw: unknown): ScheduleDay[] {
  const root = (raw && typeof raw === "object" ? raw : {}) as AnyObj;
  const value = Array.isArray(root.data) ? root.data : Array.isArray(root.jadwal) ? root.jadwal : Array.isArray(raw) ? raw : [];
  return value.map((item) => item && typeof item === "object" ? item as ScheduleDay : null).filter(Boolean) as ScheduleDay[];
}

export default async function SchedulePage() {
  const raw = await akList("schedule");
  const days = normalizeSchedule(raw);
  return <main className="min-h-screen pb-[calc(7rem+env(safe-area-inset-bottom))] pt-28 lg:pb-16 lg:pt-32"><section className="mx-auto max-w-7xl px-4 sm:px-5">
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div><p className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/10 px-4 py-2 text-sm font-black text-sky-100"><CalendarDays className="size-4" /> Jadwal</p><h1 className="mt-4 text-4xl font-black text-white md:text-5xl">Rilis minggu ini</h1><p className="mt-2 max-w-xl text-white/55">Cek anime yang tayang tiap hari.</p></div>
      <Link href="/latest" className="wuzz-button w-fit rounded-full px-5 py-3 text-sm font-black">Episode Baru</Link>
    </div>
    <div className="space-y-8">
      {days.map((day, dayIndex) => {
        const list = day.animeList ?? day.list ?? day.items ?? [];
        const label = day.day ?? day.hari ?? `Hari ${dayIndex + 1}`;
        return <section key={`${label}-${dayIndex}`} className="glass-card rounded-[2rem] p-4 md:p-6">
          <div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-2xl font-black text-white">{label}</h2>{day.date ? <span className="rounded-full bg-sky-400/10 px-3 py-1 text-sm font-bold text-sky-200">{day.date}</span> : null}</div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {list.map((item, index) => {
              const title = String(item.anime_name ?? item.judul ?? item.title ?? `Anime ${index + 1}`);
              const slug = cleanSlug(item.link ?? item.url ?? item.id);
              const href = slug ? `/anime/${encodeURIComponent(slug)}` : "/schedule";
              return <Link key={`${title}-${index}`} href={href} className="poster-card group relative overflow-hidden rounded-3xl border border-sky-300/15 bg-[#050b14]/85">
                <div className="relative aspect-[2/3] overflow-hidden bg-slate-950"><PosterImage src={item.cover} alt={title} className="size-full object-cover transition duration-700 group-hover:scale-110" /><div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" /><span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-sky-500/90 px-2.5 py-1 text-xs font-black text-white"><Clock className="size-3" />Update</span></div>
                <div className="p-3"><h3 className="line-clamp-2 text-sm font-bold text-white group-hover:text-sky-300">{title}</h3></div>
              </Link>;
            })}
          </div>
        </section>;
      })}
      {!days.length ? <div className="glass-card rounded-3xl p-8 text-white/60">Jadwal belum tersedia.</div> : null}
    </div>
  </section></main>;
}
