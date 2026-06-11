# zxlix

Katalog streaming anime multi-source berbasis Next.js (App Router). Menggabungkan beberapa server katalog upstream menjadi satu UI: update episode terbaru, ongoing, movies, rekomendasi, pencarian, genre, jadwal rilis, halaman detail anime, dan player streaming dengan beberapa server/kualitas.

## Fitur

- **Katalog gabungan (`all`)**: merge + dedupe judul dari 4 sumber upstream sekaligus.
- **Per-source browsing**: setiap server bisa dibuka terpisah lewat route `/s/[source]`.
- **Pencarian terpadu**: hasil playable dari semua server + metadata anime dari Jikan (MyAnimeList).
- **Genre**: daftar genre dengan pagination, fallback metadata via Jikan genre ID.
- **Jadwal rilis** per hari.
- **Watch player**: dukung HLS (`hls.js`), video native (mp4/webm), dan iframe embed; pilihan server dan kualitas.
- **Image proxy** (`/api/image`): poster upstream diproxy dengan allowlist host + cache, URL asli disembunyikan.
- **Poster enrichment**: poster resolusi rendah/missing diganti otomatis dari AniList lalu Kitsu, dengan memo in-memory.
- **Caching**: data list di-cache server-side (revalidate 5 menit) supaya halaman cepat dan upstream tidak dihantam tiap request.
- **SEO**: `sitemap.xml` dan `robots.txt` ter-generate.

## Tech Stack

| Bagian | Teknologi |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS 4, lucide-react |
| Player | hls.js, react-player |
| Scraping | cheerio (untuk sumber HTML) |
| Bahasa | TypeScript strict |

## Menjalankan

```bash
npm install
npm run dev      # dev server di http://localhost:3000
npm run build    # production build
npm start        # jalankan hasil build
npm run lint     # eslint
```

## Environment Variables

Semua opsional; default tertera. Simpan di `.env.local`.

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `ANIME_API_BASE_URL` | `https://apps.animekita.org/api/v1.2.5` | Base URL API AnimeKita (Server 1) |
| `ANIME_API_TOKEN` | (kosong) | Token POST untuk endpoint detail/episode AnimeKita |
| `BELLONIME_API_URL` | `http://localhost:3001` | Base URL API Bellonime (Server 2 & 3: samehadaku, otakudesu) |
| `WINBU_BASE_URL` | `https://winbu.net` | Base URL Winbu (Server 4, di-scrape via cheerio) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | URL publik untuk sitemap/robots |

> Server 2 & 3 butuh instance Bellonime (atau API kompatibel) berjalan di `BELLONIME_API_URL`. Tanpa itu, kedua server otomatis di-skip (fail-soft), katalog tetap jalan dari sumber lain.

## Sumber Data

| ID | Label UI | Jenis | Adapter |
| --- | --- | --- | --- |
| `animekita` | Server 1 | JSON API | `src/lib/animekita.ts` |
| `samehadaku` | Server 2 | Bellonime API | `src/lib/bellonime.ts` |
| `otakudesu` | Server 3 | Bellonime API | `src/lib/bellonime.ts` |
| `winbu` | Server 4 | HTML scrape (cheerio) | `src/lib/winbu.ts` |
| Jikan (MAL) | metadata | JSON API | `src/lib/jikan.ts` |
| AniList / Kitsu | poster fallback | JSON/GraphQL API | `src/lib/media-art.ts` |

Daftar source dan helper terkait ada di `src/lib/sources.ts`. Nama upstream disembunyikan dari UI (`hideSourceText`), hanya tampil sebagai "Server 1..4".

## Routing

```
/                        Home gabungan semua server
/latest|ongoing|popular|movies   Listing gabungan + pagination ((public)/[kind])
/search?q=...            Pencarian gabungan + metadata Jikan
/genres                  Daftar genre
/genres/[genre]          Listing per genre
/schedule                Jadwal rilis
/anime/[slug]            Detail anime (AnimeKita)
/watch/[episodeId]       Player episode (AnimeKita)

/s/[source]              Home per server (animekita|samehadaku|otakudesu|winbu)
/s/[source]/[kind]       Listing per server
/s/[source]/search       Pencarian per server
/s/[source]/genres[/genre]
/s/[source]/schedule
/s/[source]/anime/[slug]
/s/[source]/watch/[episodeId]

/api/catalog?kind=...    JSON katalog AnimeKita (latest|recommended|movies|ongoing|search|genre|schedule)
/api/image?u=<base64url> Image proxy (allowlist host, cache 1 hari)
```

## Arsitektur

```
Page (RSC) -> unified-catalog.ts -> adapter per source -> upstream
                     |                    (allSettled, fail-soft)
                     +-> media-art.ts (poster enrichment, AniList/Kitsu)
                     +-> jikan.ts (metadata search/genre)
```

- **`src/lib/unified-catalog.ts`** adalah inti: `sourceHome()` untuk home rails, `unifiedList()` untuk listing/search/genre. Keduanya dibungkus `unstable_cache` (revalidate 300 detik). Semua panggilan upstream pakai `Promise.allSettled`, jadi satu server mati tidak menjatuhkan halaman.
- **Dedupe judul**: `mergeCards()` menormalkan judul (lowercase alfanumerik) dan membuang duplikat antar server, termasuk substring match untuk judul >= 10 karakter.
- **Poster enrichment** (`enrichMissingPosters`): maksimal 12 kartu pertama, banner hanya dicari untuk 2 slot pertama (hero). Hasil dimemo per judul (TTL 6 jam).
- **Fetch policy**: GET list di semua adapter pakai `next: { revalidate: 300 }`; request POST (detail/episode) tetap no-store. Timeout 10-15 detik + 1 retry.
- **Image proxy**: URL di-encode base64url, divalidasi protokol + allowlist suffix host, blok IP privat/localhost (anti-SSRF). Response di-cache `max-age=86400, stale-while-revalidate=604800`.

## Struktur Direktori

```
src/
  app/
    (public)/[kind]/     Listing gabungan (latest/ongoing/popular/movies)
    s/[source]/          Semua route per-server
    api/catalog/         JSON endpoint katalog
    api/image/           Image proxy
    anime/[slug]/        Detail (gabungan)
    watch/[episodeId]/   Player (gabungan)
    search/ genres/ schedule/
    layout.tsx error.tsx loading.tsx robots.ts sitemap.ts
  components/
    source-home.tsx      Hero + rails home
    section.tsx          RailSection (grid kartu)
    anime-card.tsx       Kartu poster + DisplayCard type
    poster-image.tsx     <Image> dengan fallback kandidat + placeholder
    watch-player.tsx     Player HLS/video/iframe + pemilih server
    site-nav.tsx         Navigasi atas + bawah (mobile)
    catalog-card.tsx
  lib/
    unified-catalog.ts   Agregasi + cache + dedupe
    animekita.ts bellonime.ts winbu.ts   Adapter source
    jikan.ts media-art.ts                Metadata + poster fallback
    sources.ts images.ts catalog.ts stream-kind.ts
```

## Menambah Source Baru

1. Buat adapter di `src/lib/<nama>.ts` yang mengembalikan `DisplayCard[]` (lihat `bellonime.ts` sebagai contoh paling bersih). Wajib: timeout + `catch` fail-soft.
2. Daftarkan di `animeSources` dan union type di `src/lib/sources.ts`.
3. Sambungkan ke `sourceHomeUncached` dan `unifiedListUncached` di `src/lib/unified-catalog.ts` (tambahkan ke `Promise.allSettled` cabang `all`).
4. Kalau poster butuh proxy, tambahkan suffix host ke allowlist di `src/app/api/image/route.ts`.

## Catatan Performa

- Data list bisa basi maksimal 5 menit (`revalidate: 300` di `unstable_cache` dan fetch adapter). Turunkan kalau butuh lebih fresh, dengan konsekuensi beban upstream naik.
- Poster enrichment sengaja dibatasi (12 kartu, 2 banner) karena tiap judul = 1-2 request API eksternal.
- Hindari menambah animasi full-screen di `globals.css` (blur besar, mix-blend-mode, background pan); pernah jadi penyebab utama halaman berat.

## Disclaimer

Proyek lab/eksperimen. Konten berasal dari API/situs pihak ketiga; ketersediaan dan legalitas konten mengikuti masing-masing upstream.

