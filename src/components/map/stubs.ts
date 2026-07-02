import type { LatLng, ScheduledMarker, SavedMarker } from "./types";

/**
 * 04 §13 열린 질문 스텁 — 설계 단계 이후 구현. 현재는 골격/no-op 으로 연동 지점만 표기한다.
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

/**
 * Google Places place_id → 좌표 해석 (미결, 04 §13 "place_id·lat/lng 저장 방식").
 * 실제 저장/조회는 features/place api(useUpsertPlace: google_place_id·lat·lng, 계약 §4.5) 소관 —
 * components/map 은 표현 전용이라 여기서는 연동 지점만 둔다(no-op).
 */
export function resolvePlaceLocation(googlePlaceId: string): LatLng | null {
  // 연동 지점 표기용 — 실제 좌표 해석은 features/place api 소관. 현재는 no-op.
  void googlePlaceId;
  return null;
}
