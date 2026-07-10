/**
 * 장소 뷰 지도 패널 리사이즈 순수 로직(설계 §6 UX). 드래그/키보드/복원 값 클램프.
 * 최소 320px. 최대는 **리스트가 안 깨지는 폭**을 보장하도록 컨테이너에서 좌측 영역
 * (폴더 사이드바 + splitter + 리스트 최소폭)을 뺀 값 — 리스트가 min 아래로 줄지 않게.
 */
export const MAP_MIN_WIDTH = 320;
export const MAP_DEFAULT_WIDTH = 356;
/** 키보드(←/→) 1스텝 폭 변화. */
export const MAP_KEY_STEP = 24;

/** 좌측 고정 크롬 — FolderSidebar(w-[236px]) + splitter(w-2=8px). */
const FOLDER_SIDEBAR_WIDTH = 236;
const SPLITTER_WIDTH = 8;
/** PlaceList 최소폭 — 검색창 + "최근 저장순" 정렬 버튼이 한 줄로 유지되는 하한. */
export const PLACE_LIST_MIN_WIDTH = 344;
/** 지도 최대폭 계산 시 컨테이너에서 예약해 둘 좌측 총폭. */
export const MAP_RESERVED_LEFT =
  FOLDER_SIDEBAR_WIDTH + SPLITTER_WIDTH + PLACE_LIST_MIN_WIDTH;

export const MAP_WIDTH_KEY = "jero:placesMapWidth";
export const MAP_COLLAPSED_KEY = "jero:placesMapCollapsed";

export function clampMapWidth(
  raw: number,
  containerWidth: number,
  min: number = MAP_MIN_WIDTH,
  reservedLeft: number = MAP_RESERVED_LEFT,
): number {
  if (!Number.isFinite(raw)) return min;
  // 컨테이너를 아직 못 재면(0) min 만 보장. 잰 경우 리스트 최소폭을 남기는 상한 적용.
  const max =
    containerWidth > 0
      ? Math.max(min, containerWidth - reservedLeft)
      : Infinity;
  return Math.min(max, Math.max(min, Math.round(raw)));
}
