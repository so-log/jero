/**
 * 장소 뷰 지도 패널 리사이즈 순수 로직(설계 §6 UX). 드래그/키보드/복원 값 클램프.
 * 최소 320px, 최대 컨테이너의 maxRatio(기본 0.7). 컨테이너가 좁으면 min 을 우선.
 */
export const MAP_MIN_WIDTH = 320;
export const MAP_MAX_RATIO = 0.7;
export const MAP_DEFAULT_WIDTH = 356;
/** 키보드(←/→) 1스텝 폭 변화. */
export const MAP_KEY_STEP = 24;

export const MAP_WIDTH_KEY = "jero:placesMapWidth";
export const MAP_COLLAPSED_KEY = "jero:placesMapCollapsed";

export function clampMapWidth(
  raw: number,
  containerWidth: number,
  min: number = MAP_MIN_WIDTH,
  maxRatio: number = MAP_MAX_RATIO,
): number {
  if (!Number.isFinite(raw)) return min;
  // 컨테이너를 아직 못 재면(0) min 만 보장.
  const max =
    containerWidth > 0 ? Math.max(min, Math.round(containerWidth * maxRatio)) : Infinity;
  return Math.min(max, Math.max(min, Math.round(raw)));
}
