import type { Libraries } from "@react-google-maps/api";

import type { LatLng } from "./types";

/**
 * 지도 표현 레이어 설정 (components/map, 표현 전용 — 도메인 로직 없음).
 * 키·Map ID 는 클라이언트 노출 전제(콘솔에서 referrer/API 범위 제한). CLAUDE.md §8.1.
 */

/** 키 없을 때도 안 깨지게 — 빈 문자열로 폴백 후 hasMapsKey 로 분기. */
export const GOOGLE_MAPS_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

/** AdvancedMarkerElement 에 필요. 없으면 OverlayView 커스텀 마커로 폴백. */
export const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;

export const hasMapsKey = GOOGLE_MAPS_API_KEY.length > 0;

/** loadScript 단일 id — 한 번만 로드(중복 로드 경고 방지). */
export const MAPS_SCRIPT_ID = "jero-google-maps";

/** AdvancedMarkerElement 사용을 위한 marker 라이브러리. 모듈 레벨 const 로 고정(재로드 방지). */
export const MAPS_LIBRARIES: Libraries = ["marker"];

/** 시안 기준 도쿄. 마커가 있으면 fitBounds 로 덮어쓴다. */
export const DEFAULT_CENTER: LatLng = { lat: 35.6804, lng: 139.769 };
export const DEFAULT_ZOOM = 12;

/** 기본 UI 끄고 커스텀 줌/범례를 얹는다. mapId 있으면 AdvancedMarker 경로 활성. */
export const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: true,
  clickableIcons: false,
  gestureHandling: "greedy",
  ...(MAP_ID ? { mapId: MAP_ID } : {}),
};

/**
 * AdvancedMarkerElement 사용 가능 여부.
 * 우선순위: AME(Map ID + marker 라이브러리 로드됨) → 미지원 시 OverlayView 폴백.
 * Map ID 가 없으면 AME 가 렌더되지 않으므로 폴백을 강제한다.
 */
export function supportsAdvancedMarkers(): boolean {
  return (
    typeof google !== "undefined" &&
    !!MAP_ID &&
    !!google.maps?.marker?.AdvancedMarkerElement
  );
}
