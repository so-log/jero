import { create } from "zustand";

/**
 * 플랜 ↔ 캘린더 공유 "선택 날짜"(B5) — 단일 소스(ISO 'YYYY-MM-DD').
 * 플랜의 activeDay(인덱스)·캘린더의 cursorDate(ISO)는 각자 유지하되, 이 값을 통해 동기화한다.
 * (뷰 분리는 유지 — 공간 렌즈 vs 시간 렌즈, 선택 상태만 공유.)
 */
interface SelectionState {
  selectedDate: string | null;
  setSelectedDate: (date: string) => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedDate: null,
  setSelectedDate: (date) => set({ selectedDate: date }),
}));
