import type { ScheduledMarker, SavedMarker } from "./types";

/**
 * 04 §13 열린 질문 스텁 — 설계 단계 이후 구현. 현재는 골격/no-op 으로 연동 지점만 표기한다.
 * (place_id·lat/lng 저장 방식은 확정 구현됨: Places Autocomplete/지도 클릭 → geocode.ts·usePlacesAutocomplete →
 *  useUpsertPlace 가 lat·lng·google_place_id 기록.)
 */

/**
 * 마커 클러스터링 (미결, 04 §13 "마커 클러스터링 여부").
 * TODO: 밀집도 높아지면 @googlemaps/markerclusterer 도입 — 줌 레벨별 그룹핑.
 * 현재는 무군집(원본 그대로 반환).
 */
export function clusterMarkers<T extends ScheduledMarker | SavedMarker>(
  markers: T[],
): T[] {
  return markers;
}
