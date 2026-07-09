import type { LatLng } from "./types";

/**
 * 지도 클릭 좌표 → 주소·place_id (reverse geocoding, 04 §13 확정).
 * components/map 표현 레이어의 Google API 얇은 래퍼 — 실패/미로드 시 null(수기 입력 폴백).
 */
export interface GeocodeResult {
  address: string;
  placeId: string | null;
}

export async function reverseGeocode(
  position: LatLng,
): Promise<GeocodeResult | null> {
  if (typeof google === "undefined" || !google.maps?.Geocoder) return null;
  try {
    const geocoder = new google.maps.Geocoder();
    const { results } = await geocoder.geocode({ location: position });
    const top = results?.[0];
    if (!top) return null;
    return { address: top.formatted_address, placeId: top.place_id ?? null };
  } catch {
    return null;
  }
}
