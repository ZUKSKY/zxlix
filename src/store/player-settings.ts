import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// Persisted player preferences: volume, mute, playback speed, autoplay next.
export interface PlayerSettingsState {
  volume: number;
  muted: boolean;
  rate: number;
  autoNext: boolean;
  autoSkipIntro: boolean;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  setRate: (rate: number) => void;
  setAutoNext: (autoNext: boolean) => void;
  setAutoSkipIntro: (autoSkipIntro: boolean) => void;
}

export const usePlayerSettings = create<PlayerSettingsState>()(
  persist(
    (set) => ({
      volume: 1,
      muted: false,
      rate: 1,
      autoNext: true,
      autoSkipIntro: false,
      setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)) }),
      setMuted: (muted) => set({ muted }),
      setRate: (rate) => set({ rate }),
      setAutoNext: (autoNext) => set({ autoNext }),
      setAutoSkipIntro: (autoSkipIntro) => set({ autoSkipIntro }),
    }),
    {
      name: "zxlix-player",
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
