import { create } from "zustand";

/**
 * 일정표(05) UI 상태(설계 §4) — 모드·기간 커서. 서버상태와 분리.
 * cursorDate(ISO)는 기간 앵커: 월=해당 월, 주=cursor부터 7일, 일=해당 날짜.
 * null 이면 CalendarView 가 여행 첫날로 해석한다.
 */
export type CalendarMode = "month" | "week" | "day";

interface CalendarState {
  mode: CalendarMode;
  cursorDate: string | null;
  setMode: (mode: CalendarMode) => void;
  setCursor: (date: string) => void;
}

export const useCalendarStore = create<CalendarState>((set) => ({
  mode: "month",
  cursorDate: null,
  setMode: (mode) => set({ mode }),
  setCursor: (date) => set({ cursorDate: date }),
}));
