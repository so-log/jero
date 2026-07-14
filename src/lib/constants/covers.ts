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

/**
 * 저장되는 커버 값 — 프리셋 키 또는 임의 hex('#RRGGBB'/'#RGB'). DB(text)와 동일하게 열려 있다.
 * `(string & {})` 로 프리셋 키 자동완성은 유지하면서 임의 문자열도 허용.
 */
export type CoverValue = CoverColor | (string & {});

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** value 가 프리셋 키인지. */
export function isCoverPreset(value: string | null | undefined): value is CoverColor {
  return !!value && value in COVER;
}

/**
 * 커버 그라데이션 단일 resolver — 모든 커버 렌더 지점이 경유한다(§7.1, COVER 직접 인덱싱 금지).
 * 프리셋 키 → 고정 그라데이션. hex → 그 색 기반(밝은 2번째 스톱, color-mix). 그 외/누락 → blue 기본(크래시 방지).
 */
export function coverGradient(value: CoverValue | null | undefined): string {
  if (isCoverPreset(value)) return COVER[value].gradient;
  if (value && HEX_RE.test(value)) {
    return `linear-gradient(140deg, ${value}, color-mix(in srgb, ${value} 60%, #ffffff))`;
  }
  return COVER.blue.gradient;
}
