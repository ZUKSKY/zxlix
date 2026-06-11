export const animeSources = [
  { id: "animekita", label: "Server 1", accent: "sky", enabled: true },
  { id: "samehadaku", label: "Server 2", accent: "white", enabled: true },
  { id: "otakudesu", label: "Server 3", accent: "sky", enabled: true },
  { id: "winbu", label: "Server 4", accent: "rose", enabled: true },
  { id: "manga", label: "Manga", accent: "violet", enabled: false },
] as const;

export type SourceId = typeof animeSources[number]["id"];
export type EnabledSourceId = "animekita" | "samehadaku" | "otakudesu" | "winbu";
export type CatalogSourceId = EnabledSourceId | "all";

const SOURCE_NAMES = ["animekita", "samehadaku", "otakudesu", "winbu", "jikan", "metadata"];
const SOURCE_NAME_RE = new RegExp(`\\b(${SOURCE_NAMES.join("|")})\\b`, "ig");

export function isSourceId(value?: string): value is SourceId {
  return animeSources.some((source) => source.id === value);
}

export function isEnabledSource(value?: string): value is EnabledSourceId {
  return value === "animekita" || value === "samehadaku" || value === "otakudesu" || value === "winbu";
}

export function sourceLabel(source: string) {
  if (source === "all") return "Semua Server";
  if (source === "animekita") return "Server 1";
  if (source === "samehadaku") return "Server 2";
  if (source === "otakudesu") return "Server 3";
  if (source === "winbu") return "Server 4";
  return "Server";
}

export function hideSourceText(value?: string | number) {
  const text = String(value ?? "").replace(SOURCE_NAME_RE, "Server").replace(/\s+/g, " ").trim();
  if (!text || /^server$/i.test(text) || /^server\s*·?\s*server$/i.test(text)) return undefined;
  return text;
}
