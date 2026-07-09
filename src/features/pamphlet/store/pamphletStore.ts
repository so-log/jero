import { create } from "zustand";

import type { PamphletThemeKey } from "@/lib/constants/pamphletThemes";

import { DEFAULT_PREP, type PrepItem } from "../lib/prep";
import type { PamphletSections } from "../lib/faces";

/**
 * 팜플렛 UI 상태(2차, 팜플렛_설계 §2) — 섹션 선택·테마·준비물·QR 토큰. 서버 저장 안 함(기획 §4).
 * 도메인 UI 상태라 Zustand. QR 토큰은 세션 캐시(중복 발급 방지).
 */
interface PamphletState {
  sections: PamphletSections;
  themeKey: PamphletThemeKey;
  prep: PrepItem[];
  /** QR 인코딩용 공유 토큰(발급 후 캐시). */
  shareToken: string | null;
  toggleSection: (key: keyof PamphletSections) => void;
  setTheme: (key: PamphletThemeKey) => void;
  togglePrep: (index: number) => void;
  addPrep: (label: string) => void;
  setShareToken: (token: string) => void;
}

export const usePamphletStore = create<PamphletState>((set) => ({
  sections: { cover: true, schedule: true, prep: true, intro: true, qr: true },
  themeKey: "beach",
  prep: DEFAULT_PREP.map((p) => ({ ...p })),
  shareToken: null,
  toggleSection: (key) =>
    set((s) => ({ sections: { ...s.sections, [key]: !s.sections[key] } })),
  setTheme: (key) => set({ themeKey: key }),
  togglePrep: (index) =>
    set((s) => ({
      prep: s.prep.map((p, i) => (i === index ? { ...p, on: !p.on } : p)),
    })),
  addPrep: (label) =>
    set((s) => ({ prep: [...s.prep, { label, on: true }] })),
  setShareToken: (token) => set({ shareToken: token }),
}));
