import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteNav } from "@/components/site-nav";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "ZXLIX",
  description: "Streaming catalog modern dengan update episode, movie, genre, jadwal, dan pencarian cepat.",
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/zxlix-minimal-icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  applicationName: "ZXLIX",
  appleWebApp: { capable: true, title: "ZXLIX", statusBarStyle: "black-translucent" },
  openGraph: {
    title: "ZXLIX",
    description: "Streaming catalog modern dengan update episode, movie, genre, jadwal, dan pencarian cepat.",
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "zxlix" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id" data-scroll-behavior="smooth"><body className={`${geistSans.variable} ${geistMono.variable} antialiased`}><PwaRegister /><SiteNav source="all" />{children}</body></html>;
}
