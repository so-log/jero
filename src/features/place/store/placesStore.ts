import { create } from "zustand";

import { ALL_FOLDER, type SortKey } from "../types";

/**
 * 장소(06) UI 상태(설계 §4) — 폴더·선택·검색·정렬. 서버상태(장소·폴더)와 분리.
 * `assigned`(placeId → Day 번호)는 "일정에 추가" 결과의 **로컬 스텁**(04 §13 배정 플로우).
 * 실제 배정은 useAddPlaceToSchedule 뮤테이션이 scheduled_date 를 써서 04·05와 동기화(아래 api 참조).
 */
interface PlacesState {
  folderId: string;
  selectedId: string | null;
  query: string;
  sort: SortKey;
  /** 로컬 배정 스텁: placeId → Day 번호(1-based). 서버 미반영. */
  assigned: Record<string, number>;
  setFolder: (folderId: string) => void;
  select: (id: string | null) => void;
  setQuery: (query: string) => void;
  setSort: (sort: SortKey) => void;
  assignLocal: (placeId: string, day: number) => void;
  unassignLocal: (placeId: string) => void;
}

export const usePlacesStore = create<PlacesState>((set) => ({
  folderId: ALL_FOLDER,
  selectedId: null,
  query: "",
  sort: "recent",
  assigned: {},
  // 폴더 전환 시 선택 초기화(설계 §6.1).
  setFolder: (folderId) => set({ folderId, selectedId: null }),
  select: (id) => set((s) => ({ selectedId: s.selectedId === id ? null : id })),
  setQuery: (query) => set({ query }),
  setSort: (sort) => set({ sort }),
  assignLocal: (placeId, day) =>
    set((s) => ({ assigned: { ...s.assigned, [placeId]: day } })),
  unassignLocal: (placeId) =>
    set((s) => {
      const next = { ...s.assigned };
      delete next[placeId];
      return { assigned: next };
    }),
}));
