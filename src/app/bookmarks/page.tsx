import type { Metadata } from "next";
import { BookmarksList } from "./bookmarks-list";

export const metadata: Metadata = {
  title: "Bookmark · zxlix",
  description: "Daftar anime yang kamu simpan untuk ditonton nanti.",
};

export default function BookmarksPage() {
  return (
    <main className="min-h-screen pb-[calc(7rem+env(safe-area-inset-bottom))] pt-28 lg:pb-16 lg:pt-32">
      <BookmarksList />
    </main>
  );
}
