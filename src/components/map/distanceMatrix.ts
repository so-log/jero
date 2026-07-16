import type { LatLng } from "./types";

/**
 * 실이동시간 매트릭스(동선 최적화 3단계, 설계 §2.1) — Google DistanceMatrixService 얇은 래퍼.
 * components/map 표현 레이어의 Google API 래퍼(geocode.ts 와 동일 스타일).
 * 미로드/키없음/쿼터/일부 실패 → **null**(호출측이 Haversine 로 자연스럽게 폴백, 크래시 없음).
 * 요청은 1회(origins×destinations 한 번) — 비용 관리(설계 §5).
 */
export type TravelMode = "WALKING" | "TRANSIT" | "DRIVING";

/** n×n 이동시간(분) 매트릭스. 대각 0. 실패 시 null. */
export async function fetchTravelTimeMatrix(
  coords: readonly LatLng[],
  mode: TravelMode = "WALKING",
): Promise<number[][] | null> {
  if (typeof google === "undefined" || !google.maps?.DistanceMatrixService) {
    return null;
  }
  const n = coords.length;
  if (n < 2) return null;

  try {
    const service = new google.maps.DistanceMatrixService();
    const points = coords.map((c) => ({ lat: c.lat, lng: c.lng }));
    const res = await service.getDistanceMatrix({
      origins: points,
      destinations: points,
      travelMode: google.maps.TravelMode[mode],
    });
    if (!res || res.rows.length !== n) return null;

    const matrix: number[][] = coords.map(() => new Array<number>(n).fill(0));
    for (let i = 0; i < n; i++) {
      const elements = res.rows[i]?.elements;
      if (!elements || elements.length !== n) return null;
      for (let j = 0; j < n; j++) {
        if (i === j) continue; // 자기자신 0
        const el = elements[j];
        if (el?.status !== "OK" || !el.duration) return null; // 하나라도 실패 → 전체 폴백
        matrix[i][j] = el.duration.value / 60; // 초 → 분
      }
    }
    return matrix;
  } catch {
    return null;
  }
}
