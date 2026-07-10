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

/** POI 라벨 클릭 → 장소 상세(이름·주소·좌표·place_id). PlacesService.getDetails 래퍼. 실패 시 null. */
export interface PlaceDetails {
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId: string;
}

export function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  return new Promise((resolve) => {
    if (typeof google === "undefined" || !google.maps?.places?.PlacesService) {
      resolve(null);
      return;
    }
    // getDetails 는 map/div 컨테이너가 필요 — 표시 없는 detached div 로 충분.
    const service = new google.maps.places.PlacesService(
      document.createElement("div"),
    );
    service.getDetails(
      {
        placeId,
        fields: ["name", "formatted_address", "geometry", "place_id"],
      },
      (result, status) => {
        const loc = result?.geometry?.location;
        if (
          status !== google.maps.places.PlacesServiceStatus.OK ||
          !result ||
          !loc
        ) {
          resolve(null);
          return;
        }
        resolve({
          name: result.name ?? "",
          address: result.formatted_address ?? "",
          lat: loc.lat(),
          lng: loc.lng(),
          placeId: result.place_id ?? placeId,
        });
      },
    );
  });
}
