import { create } from "zustand";

/**
 * 워크스페이스 오버레이(10) 표시 상태 — 전역(중립 위치)이라 04~07·workspace 가 순환 의존 없이 공유.
 * 오버레이는 라우트가 아니라 호출 뷰 위에 뜬다(설계 §8). 닫으면 호출 뷰 유지.
 */
export type OverlayType = "place" | "share" | "expense";

interface OverlayState {
  active: OverlayType | null;
  /** 편집 대상 place id(있으면 편집, 없으면 추가). */
  placeId: string | null;
  /** 편집 대상 expense id(있으면 편집, 없으면 추가). */
  expenseId: string | null;
  open: (
    type: OverlayType,
    payload?: { placeId?: string; expenseId?: string },
  ) => void;
  close: () => void;
}

export const useOverlayStore = create<OverlayState>((set) => ({
  active: null,
  placeId: null,
  expenseId: null,
  open: (type, payload) =>
    set({
      active: type,
      placeId: payload?.placeId ?? null,
      expenseId: payload?.expenseId ?? null,
    }),
  close: () => set({ active: null, placeId: null, expenseId: null }),
}));
