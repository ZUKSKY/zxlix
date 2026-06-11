import { NextRequest, NextResponse } from "next/server";
import { akList, toCard } from "@/lib/animekita";

const allowed = new Set(["latest", "recommended", "movies", "ongoing", "search", "genre", "schedule"]);

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const kind = search.get("kind") ?? "latest";
  if (!allowed.has(kind)) return NextResponse.json({ ok: false, message: "Invalid catalog request" }, { status: 400 });
  try {
    const data = await akList(kind as "latest" | "recommended" | "movies" | "ongoing" | "search" | "genre" | "schedule", {
      page: search.get("page") ?? "1",
      keyword: search.get("q") ?? "",
      url: search.get("genre") ? `${search.get("genre")}/` : "action/",
      type: search.get("type") ?? "all",
    });
    return NextResponse.json({ ok: true, data: kind === "schedule" ? data : data.map(toCard) });
  } catch (error) {
    console.error("Catalog request failed", error);
    return NextResponse.json({ ok: false, message: "Catalog request failed" }, { status: 502 });
  }
}
