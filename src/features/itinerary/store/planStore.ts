import { create } from "zustand";

import type { CategoryKey } from "@/lib/constants/category";

/**
 * 플랜 뷰 UI 상태(설계 §4) — 서버상태(장소·멤버)와 혼용 금지.
 * activeDay 는 새로고침·공유 복원을 위해 URL 동기화가 권장이나, 여기선 로컬 일시 상태로 둔다.
 */
interface PlanState {
  activeDay: number;
  /** "선택한 날짜 일정만 보기" — true 면 저장 마커 숨김. */
  filterToday: boolean;
  activeCategory: CategoryKey | "all";
  /** 리스트↔지도 양방향 하이라이트 대상. */
  selectedId: string | null;
  setActiveDay: (index: number) => void;
  toggleFilterToday: () => void;
  setActiveCategory: (category: CategoryKey | "all") => void;
  select: (id: string | null) => void;
}

export const usePlanStore = create<PlanState>((set) => ({
  activeDay: 0,
  filterToday: true,
  activeCategory: "all",
  selectedId: null,
  // 날짜 전환 시 선택 초기화(설계 §6.1).
  setActiveDay: (index) => set({ activeDay: index, selectedId: null }),
  toggleFilterToday: () => set((s) => ({ filterToday: !s.filterToday })),
  setActiveCategory: (category) => set({ activeCategory: category }),
  select: (id) => set((s) => ({ selectedId: s.selectedId === id ? null : id })),
}));
