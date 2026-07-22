"use client";

import { useEffect, useMemo, useState } from "react";

import { geocodeCity, type LatLng } from "@/components/map";

/** 도시 단위 지도 줌(도시 전체가 한눈에). fitBounds 를 쓰는 경우엔 미사용. */
const CITY_ZOOM = 11;

/**
 * 도시 전환 시 지도 중심 이동(다중 도시 Phase 3, 설계 §7). 우선순위:
 *   1) 도시에 대표 좌표(lat/lng)가 있으면 → 그 지점으로 panTo(flyTo).
 *   2) 없으면(Phase 2 미수집) → 그 도시 장소들 bounds 에 fit(기존 MapCanvas fitBounds 재사용).
 *   3) 장소도 없으면 → 도시명(+국가) 지오코딩 폴백 → 그 지점으로 panTo.
 * enabled=false(단일 도시)면 아무 것도 반환하지 않아 기존 자동 fitBounds 동작 그대로(회귀 0).
 */
export interface CityMapFocus {
  /** 지점 이동(도시 좌표/지오코딩). */
  flyTo: { position: LatLng; zoom?: number } | null;
  /** 도시 장소 좌표 묶음 — MapCanvas 가 fitBounds. */
  flyToBounds: LatLng[] | null;
}

const EMPTY: CityMapFocus = { flyTo: null, flyToBounds: null };

interface Params {
  enabled: boolean;
  /** 활성 도시 식별자 — 이 값이 바뀔 때만 지도를 다시 맞춘다(사용자 드래그와 충돌 방지). */
  cityId: string | null;
  cityLatLng: LatLng | null;
  /** 그 도시 장소 좌표(fit 대상). */
  positions: LatLng[];
  cityName: string | null;
  cityCountry: string | null;
}

export function useCityMapFocus({
  enabled,
  cityId,
  cityLatLng,
  positions,
  cityName,
  cityCountry,
}: Params): CityMapFocus {
  // 좌표 묶음의 안정 서명 — 내용이 같으면 참조가 바뀌어도 재-fit 하지 않는다.
  const positionsSig = useMemo(
    () =>
      positions.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join("|"),
    [positions],
  );

  // 지오코딩 결과를 도시 식별자와 함께 보관 — cityId 가 바뀌면 이전 도시 좌표는
  // 자동으로 무시되므로 effect 안에서 동기 reset(cascading render)이 필요 없다.
  const [geocoded, setGeocoded] = useState<{ id: string; pos: LatLng } | null>(
    null,
  );

  const needGeocode =
    enabled && !!cityId && !cityLatLng && positions.length === 0;

  useEffect(() => {
    if (!needGeocode || !cityId || !cityName) return;
    let cancelled = false;
    void geocodeCity(cityName, cityCountry).then((r) => {
      if (!cancelled && r) setGeocoded({ id: cityId, pos: r });
    });
    return () => {
      cancelled = true;
    };
    // cityId 가 바뀔 때만 재지오코딩(이름·국가는 도시에 종속).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needGeocode, cityId]);

  // 현재 도시에 해당하는 지오코딩 좌표만 사용(이전 도시 결과는 버린다).
  const geocodedForCity =
    geocoded && geocoded.id === cityId ? geocoded.pos : null;

  return useMemo<CityMapFocus>(() => {
    if (!enabled || !cityId) return EMPTY;
    if (cityLatLng)
      return { flyTo: { position: cityLatLng, zoom: CITY_ZOOM }, flyToBounds: null };
    if (positions.length > 0) return { flyTo: null, flyToBounds: positions };
    if (geocodedForCity)
      return { flyTo: { position: geocodedForCity, zoom: CITY_ZOOM }, flyToBounds: null };
    return EMPTY;
    // positionsSig 로 좌표 내용 변화만 반영(참조 churn 무시).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, cityId, cityLatLng?.lat, cityLatLng?.lng, positionsSig, geocodedForCity]);
}
