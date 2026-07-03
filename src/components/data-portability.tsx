"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { useBookmarks } from "@/store/bookmarks";
import { useHistory } from "@/store/history";

interface BackupFile {
  app?: "zxlix";
  version?: number;
  exportedAt?: string;
  bookmarks?: unknown;
  history?: unknown;
}

export function DataPortability() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const bookmarks = useBookmarks((state) => state.items);
  const history = useHistory((state) => state.items);
  const importBookmarks = useBookmarks((state) => state.importItems);
  const importHistory = useHistory((state) => state.importItems);

  const exportData = () => {
    const data = JSON.stringify({ app: "zxlix", version: 1, exportedAt: new Date().toISOString(), bookmarks, history }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `zxlix-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Backup diunduh.");
  };

  const importData = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as BackupFile;
      if (parsed.app !== "zxlix" && !parsed.bookmarks && !parsed.history) throw new Error("Invalid backup");
      if (parsed.bookmarks && typeof parsed.bookmarks === "object") importBookmarks(parsed.bookmarks as Record<string, never>);
      if (parsed.history && typeof parsed.history === "object") importHistory(parsed.history as Record<string, never>);
      setMessage("Backup berhasil diimpor.");
    } catch {
      setMessage("File backup tidak valid.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return <div className="flex flex-wrap items-center gap-2">
    <button type="button" onClick={exportData} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-xs font-bold text-white/60 transition hover:border-sky-300/40 hover:text-sky-200"><Download className="size-3.5" />Export JSON</button>
    <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-xs font-bold text-white/60 transition hover:border-sky-300/40 hover:text-sky-200"><Upload className="size-3.5" />Import</button>
    <input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => void importData(event.target.files?.[0])} />
    {message ? <span className="text-xs font-bold text-sky-200/80">{message}</span> : null}
  </div>;
}
