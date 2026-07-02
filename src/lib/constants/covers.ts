/**
 * 여행 커버 색 단일 출처 (Trip.cover_color enum / 내 여행 목록.dc.html COVERS).
 * 커버 그라데이션을 한 곳에서만 정의 — 컴포넌트 하드코딩 금지(§7.1). 색은 디자인 팔레트 고정값.
 */
export type CoverColor = "blue" | "mint" | "coral" | "purple" | "amber";

export const COVER: Record<CoverColor, { gradient: string }> = {
  blue: { gradient: "linear-gradient(140deg, #6E9CF2, #9CC2F8)" },
  mint: { gradient: "linear-gradient(140deg, #4FC9A6, #8FE0C8)" },
  coral: { gradient: "linear-gradient(140deg, #F2A98E, #F8CBA8)" },
  purple: { gradient: "linear-gradient(140deg, #9D8DF0, #C2B6F7)" },
  amber: { gradient: "linear-gradient(140deg, #E9B45C, #F4D592)" },
};

export const COVER_COLORS: CoverColor[] = [
  "blue",
  "mint",
  "coral",
  "purple",
  "amber",
];
