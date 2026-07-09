"use client";

import { useJsApiLoader } from "@react-google-maps/api";
import { type RefObject, useEffect, useRef } from "react";

import {
  GOOGLE_MAPS_API_KEY,
  MAPS_LIBRARIES,
  MAPS_SCRIPT_ID,
} from "./config";

/**
 * Google Places Autocomplete 를 주어진 input 에 부착(04 §13, "위치·주소" 검색).
 * 선택 시 name·formatted_address·좌표·place_id 를 콜백으로 넘긴다. 좌표 없는 결과는 무시(수기 입력 유지).
 * 세션 토큰: 클래식 `Autocomplete` 위젯이 내부적으로 세션 단위 과금 토큰을 관리한다(선택 후 리셋).
 * 미로드/키 없음이면 아무것도 부착하지 않음 → 평범한 텍스트 입력으로 동작(수기 입력 허용).
 */
export interface PlaceSelection {
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId: string | null;
}

export function usePlacesAutocomplete(
  inputRef: RefObject<HTMLInputElement | null>,
  onSelect: (sel: PlaceSelection) => void,
): { ready: boolean } {
  const { isLoaded } = useJsApiLoader({
    id: MAPS_SCRIPT_ID,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: MAPS_LIBRARIES,
  });

  // 최신 콜백 참조(리스너 재부착 없이 갱신) — 렌더 중 ref 쓰기 금지라 effect 에서 갱신.
  const cb = useRef(onSelect);
  useEffect(() => {
    cb.current = onSelect;
  });

  useEffect(() => {
    const el = inputRef.current;
    if (!isLoaded || !el || !google.maps.places?.Autocomplete) return;

    const ac = new google.maps.places.Autocomplete(el, {
      fields: ["name", "formatted_address", "geometry", "place_id"],
    });
    const listener = ac.addListener("place_changed", () => {
      const p = ac.getPlace();
      const loc = p.geometry?.location;
      if (!loc) return; // 좌표 없는 불완전 선택 → 무시(수기 입력 유지).
      cb.current({
        name: p.name ?? "",
        address: p.formatted_address ?? "",
        lat: loc.lat(),
        lng: loc.lng(),
        placeId: p.place_id ?? null,
      });
    });

    return () => listener.remove();
  }, [isLoaded, inputRef]);

  // 자동완성 드롭다운(.pac-container)은 body 에 렌더된다 — 그 위 클릭이 모달 "바깥 클릭"으로
  // 처리돼 닫히는 것을 막는다(capture 단계에서 전파 차단, base-ui dismiss 회피).
  useEffect(() => {
    const stop = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.(".pac-container")) e.stopPropagation();
    };
    const types = ["pointerdown", "mousedown", "click", "touchstart"] as const;
    types.forEach((ty) => window.addEventListener(ty, stop, true));
    return () =>
      types.forEach((ty) => window.removeEventListener(ty, stop, true));
  }, []);

  return { ready: isLoaded };
}
