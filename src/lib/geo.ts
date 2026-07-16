/**
 * 지리 유틸(순수) — 좌표·직선거리. 도메인/DOM 무지, 부수효과 없음.
 * Haversine 은 통계(이동거리)·동선 최적화(비용 매트릭스)가 공유하는 단일 출처.
 */

export interface Coord {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** 두 좌표 간 Haversine 직선 거리(km). 대칭(a↔b 동일)·자기자신 0. */
export function haversineKm(a: Coord, b: Coord): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}
