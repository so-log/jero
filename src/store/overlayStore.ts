import { create } from "zustand";

/**
 * 워크스페이스 오버레이(10) 표시 상태 — 전역(중립 위치)이라 04~07·workspace 가 순환 의존 없이 공유.
 * 오버레이는 라우트가 아니라 호출 뷰 위에 뜬다(설계 §8). 닫으면 호출 뷰 유지.
 */
export type OverlayType = "place" | "share" | "expense";

/** 지도 클릭 등록 프리필(좌표·주소) — "장소 추가"를 이 값으로 미리 채운다. */
export interface PlacePrefill {
  name?: string;
  address?: string;
  lat?: number | null;
  lng?: number | null;
  googlePlaceId?: string | null;
  /** 플랜 Day 맥락 추가(B6) — 지정 시 저장하면 그 날짜에 배정(scheduled_date). 없으면 미배정. */
  scheduledDate?: string | null;
  /** 다중 도시 Phase 4 — 신규 장소를 현재 보고 있는 도시로 기본 배정(city_id). 없으면 미배정. */
  cityId?: string | null;
}

interface OverlayState {
  active: OverlayType | null;
  /** 편집 대상 place id(있으면 편집, 없으면 추가). */
  placeId: string | null;
  /** 지도 클릭 등록 등 "장소 추가" 프리필(placeId 없을 때만 의미). */
  placePrefill: PlacePrefill | null;
  /** 편집 대상 expense id(있으면 편집, 없으면 추가). */
  expenseId: string | null;
  open: (
    type: OverlayType,
    payload?: {
      placeId?: string;
      expenseId?: string;
      placePrefill?: PlacePrefill;
    },
  ) => void;
  close: () => void;
}

export const useOverlayStore = create<OverlayState>((set) => ({
  active: null,
  placeId: null,
  placePrefill: null,
  expenseId: null,
  open: (type, payload) =>
    set({
      active: type,
      placeId: payload?.placeId ?? null,
      placePrefill: payload?.placePrefill ?? null,
      expenseId: payload?.expenseId ?? null,
    }),
  close: () =>
    set({ active: null, placeId: null, placePrefill: null, expenseId: null }),
}));
