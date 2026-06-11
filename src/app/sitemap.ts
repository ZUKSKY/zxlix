import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return ["", "latest", "ongoing", "movies", "popular", "genres", "schedule", "search"].map((path) => ({
    url: `${baseUrl}${path ? `/${path}` : ""}`,
    lastModified: new Date(),
  }));
}
