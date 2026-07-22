/**
 * 다중 도시 색 팔레트 (다중 도시 Phase 3) — 도시를 seq 순으로 구분하는 카테고리형 색.
 * CATEGORY(§category.ts)와 같은 규약: 색은 여기서만 정의하고 컴포넌트는 인라인 style 로 소비(하드코딩 금지, CLAUDE.md §7.1).
 * 시안(다중 도시.dc.html)의 도쿄=파랑 / 오사카=주황 / 교토=초록 팔레트를 확장해 순환한다(도시 수 가변).
 */

export interface CityColor {
  /** 강조 전경(점·라벨·활성 배경). */
  color: string;
  /** 옅은 배경(비활성 칩·셀 밴드). */
  tint: string;
  /** 경계선(도시 구간 divider). */
  line: string;
}

/** seq 0,1,2,… 순으로 배정. 개수를 넘으면 순환(색 재사용). */
export const CITY_PALETTE: CityColor[] = [
  { color: "#3172E3", tint: "#EAF1FE", line: "#DCE6F8" }, // 파랑
  { color: "#FF7A4D", tint: "#FFEDE6", line: "#FBD9CC" }, // 주황
  { color: "#1FA078", tint: "#E1F6EE", line: "#C7EBDD" }, // 초록
  { color: "#8B6FE0", tint: "#F1ECFD", line: "#E4DBF8" }, // 보라
  { color: "#D9609A", tint: "#FCE8F1", line: "#F7D6E6" }, // 분홍
  { color: "#C5893A", tint: "#FBF1E4", line: "#F0E0C6" }, // 앰버
];

/** 도시 순서(seq, 0-based) → 색. 음수·초과는 순환 처리(항상 유효 색 반환). */
export function cityColor(seq: number): CityColor {
  const n = CITY_PALETTE.length;
  const i = ((Math.trunc(seq) % n) + n) % n;
  return CITY_PALETTE[i];
}
