"use client";

import Image from "next/image";
import Link from "next/link";
import { Bookmark, CalendarDays, Clapperboard, Film, Home, Search, Tags } from "lucide-react";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useEffect, useRef, useState } from "react";

function joinBase(base: string, path = "") {
  if (!path) return base || "/";
  return `${base === "/" ? "" : base}${path}`;
}

function menus(base: string) {
  return [
    { href: joinBase(base), label: "Home", icon: Home },
    { href: joinBase(base, "/latest"), label: "Update", icon: Clapperboard },
    { href: joinBase(base, "/movies"), label: "Movie", icon: Film },
    { href: joinBase(base, "/schedule"), label: "Jadwal", icon: CalendarDays },
    { href: joinBase(base, "/genres"), label: "Genre", icon: Tags },
    { href: "/bookmarks", label: "Simpan", icon: Bookmark },
  ];
}

const navbarShadow = [
  "0 0 0 1px rgba(56, 189, 248, 0.12)",
  "0 18px 70px rgba(0, 0, 0, 0.45)",
  "0 0 44px rgba(14, 165, 233, 0.12)",
  "inset 0 1px 0 rgba(255, 255, 255, 0.08)",
].join(", ");

export function SiteNav({ source = "all" }: { source?: string }) {
  const base = source === "all" ? "/" : `/s/${source}`;
  const menuItems = menus(base);
  const [visible, setVisible] = useState(false);
  const { scrollY } = useScroll();
  const frame = useRef<number | null>(null);
  const latestVisible = useRef(false);
  const currentVisible = useRef(false);

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  useMotionValueEvent(scrollY, "change", (latest) => {
    latestVisible.current = latest > 100;
    if (frame.current !== null) return;

    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      if (currentVisible.current === latestVisible.current) return;
      currentVisible.current = latestVisible.current;
      setVisible(latestVisible.current);
    });
  });

  return <>
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="fixed inset-x-0 top-0 z-50 w-full pt-4"
    >
      <motion.div
        initial={false}
        animate={{
          backdropFilter: visible ? "blur(16px)" : "none",
          boxShadow: visible ? navbarShadow : "none",
          width: visible ? "55%" : "100%",
          y: visible ? 8 : 0,
        }}
        transition={{ type: "spring", stiffness: 200, damping: 50 }}
        style={{
          minWidth: visible ? "900px" : "800px",
        }}
        className={`relative z-[60] mx-auto hidden w-full max-w-7xl flex-row items-center justify-between self-start overflow-hidden rounded-full border px-4 py-2 lg:flex ${visible
          ? "border-sky-300/15 bg-[#050b14]/95"
          : "border-transparent bg-transparent"
        }`}
      >
        <Link href={base} className="relative z-20 flex items-center gap-3 py-1 text-2xl font-black tracking-tight text-white">
          <Image src="/brand/zxlix-eye-icon.svg" alt="" width={36} height={36} priority className="size-9 rounded-xl shadow-[0_0_30px_rgba(14,165,233,.55)] ring-1 ring-white/15" />
          <span className="leading-none">zxlix</span>
        </Link>

        <nav className="absolute inset-0 hidden flex-1 flex-row items-center justify-center space-x-2 text-sm font-medium text-white/68 transition duration-200 lg:flex">
          {menuItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="group relative px-4 py-2 transition hover:text-white">
            <span className="pointer-events-none absolute inset-0 h-full w-full rounded-full bg-white/[.07] opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
            <span className="relative z-20 inline-flex items-center gap-2"><Icon className="size-4 text-sky-300/70 transition group-hover:text-sky-200" />{label}</span>
          </Link>)}
        </nav>

        <div className="relative z-20 flex items-center gap-2">
          <Link href={joinBase(base, "/search")} aria-label="Search" className="grid size-9 place-items-center rounded-full bg-white/[.07] text-white transition hover:bg-sky-400/15 hover:text-sky-100"><Search className="size-4.5" /></Link>
        </div>
      </motion.div>

      <div className="mx-4 flex items-center justify-between rounded-3xl border border-sky-300/15 bg-[#050b14]/95 px-4 py-3 shadow-[0_16px_48px_rgba(0,0,0,.45)] backdrop-blur-xl lg:hidden">
        <Link href={base} className="flex items-center gap-2 text-xl font-black text-white"><Image src="/brand/zxlix-eye-icon.svg" alt="" width={36} height={36} priority className="size-9 rounded-xl" />zxlix</Link>
        <Link href={joinBase(base, "/search")} aria-label="Search" className="grid size-10 place-items-center rounded-full bg-white/[.07] text-white"><Search className="size-5" /></Link>
      </div>
    </motion.header>

    <nav className="fixed bottom-4 left-4 right-4 z-50 grid grid-cols-6 rounded-[1.5rem] border border-sky-300/15 bg-[#050b14]/95 p-2 text-center text-[11px] font-bold text-white/75 shadow-[0_20px_70px_rgba(2,132,199,.2)] backdrop-blur-2xl lg:hidden">
      {menuItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex flex-col items-center gap-1 rounded-2xl px-2 py-2 transition hover:bg-sky-400/15 hover:text-white"><Icon className="size-4 text-sky-300" />{label}</Link>)}
    </nav>
  </>;
}
