/**
 * 팜플렛 테마 단일 출처(2차, 팜플렛_설계 §3) — 프로토타입 `팜플렛 내보내기.dc.html` THEMES 이관.
 * 색·이름·art 키만 상수(하드코딩 금지 §7.1). art = 패턴 계열(pattern) 또는 씬 계열(scene) 렌더 키.
 */
export type PamphletThemeKey =
  | "beach"
  | "city"
  | "cherry"
  | "snow"
  | "food"
  | "basic"
  | "sky"
  | "meadow"
  | "forest"
  | "seascene"
  | "train"
  | "plane";

export type PatternKey = "waves" | "city" | "petals" | "flakes" | "dots" | "grid";
export type SceneKey = "sky" | "meadow" | "forest" | "sea" | "train" | "plane";

export interface PamphletTheme {
  key: PamphletThemeKey;
  name: string;
  /** 팔레트 */
  ink: string;
  accent: string;
  accent2: string;
  wash: string;
  soft: string;
  line: string;
  chipBg: string;
  /** 표지 배경 아트 — 패턴 계열 또는 씬 계열(둘 중 하나). */
  pattern?: PatternKey;
  scene?: SceneKey;
}

export const PAMPHLET_THEMES: Record<PamphletThemeKey, PamphletTheme> = {
  beach: { key: "beach", name: "여름 바다", ink: "#0E4F5C", accent: "#159AB8", accent2: "#FF8A65", wash: "#E4F3F6", soft: "#F1F9FB", line: "#D3E9ED", chipBg: "#D8EEF2", pattern: "waves" },
  city: { key: "city", name: "도시", ink: "#242A38", accent: "#4E63C4", accent2: "#E0A93B", wash: "#EBEDF7", soft: "#F4F5FA", line: "#DEE1EF", chipBg: "#E1E5F6", pattern: "city" },
  cherry: { key: "cherry", name: "벚꽃", ink: "#7A2E4E", accent: "#E87BA6", accent2: "#F4B8B0", wash: "#FBE9F1", soft: "#FDF4F8", line: "#F2D6E2", chipBg: "#F8DEEA", pattern: "petals" },
  snow: { key: "snow", name: "설경", ink: "#2E4159", accent: "#5E86C4", accent2: "#8FB7DE", wash: "#EAF0F7", soft: "#F5F8FC", line: "#DCE6F1", chipBg: "#E1EBF6", pattern: "flakes" },
  food: { key: "food", name: "미식", ink: "#6B2E1E", accent: "#D9603B", accent2: "#E0A93B", wash: "#FBECE4", soft: "#FDF5F0", line: "#F0D8CC", chipBg: "#F7DECF", pattern: "dots" },
  basic: { key: "basic", name: "기본", ink: "#1B2030", accent: "#3B7DF0", accent2: "#3FC4A0", wash: "#EAF1FE", soft: "#F7FAFF", line: "#DCE6F8", chipBg: "#E4EDFB", pattern: "grid" },
  sky: { key: "sky", name: "해 · 하늘", ink: "#1E5A8A", accent: "#3FAEF0", accent2: "#FFC24D", wash: "#E4F3FE", soft: "#F2FAFF", line: "#D3E9F9", chipBg: "#DBEEFC", scene: "sky" },
  meadow: { key: "meadow", name: "잔디 들판", ink: "#2E6B3A", accent: "#5BC46A", accent2: "#FF9BB6", wash: "#EAF7E1", soft: "#F4FBEF", line: "#D8EDCB", chipBg: "#E1F3D6", scene: "meadow" },
  forest: { key: "forest", name: "숲", ink: "#23553F", accent: "#3FA679", accent2: "#E2A24C", wash: "#E6F4EC", soft: "#F2FAF5", line: "#D2E8DB", chipBg: "#DBEFE3", scene: "forest" },
  seascene: { key: "seascene", name: "바다 씬", ink: "#0E566A", accent: "#25A9C6", accent2: "#FF7B6B", wash: "#E1F2F6", soft: "#F0FAFC", line: "#CEE8EE", chipBg: "#D6EDF3", scene: "sea" },
  train: { key: "train", name: "기차", ink: "#7A3B2A", accent: "#F0704F", accent2: "#66C2E0", wash: "#FDECE5", soft: "#FEF5F1", line: "#F3D9CD", chipBg: "#F8DED3", scene: "train" },
  plane: { key: "plane", name: "비행기", ink: "#274690", accent: "#5B8DEF", accent2: "#FF9E6B", wash: "#EAF1FE", soft: "#F5F9FF", line: "#DCE6F8", chipBg: "#E4EDFB", scene: "plane" },
};

/** 칩·프리셋 노출 순서(패턴 계열 → 씬 계열). */
export const PAMPHLET_THEME_ORDER: PamphletThemeKey[] = [
  "beach", "city", "cherry", "snow", "food", "basic",
  "sky", "meadow", "forest", "seascene", "train", "plane",
];
