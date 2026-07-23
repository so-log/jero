/**
 * 장소(06) UI 타입. 도메인 데이터(PlaceDto·FolderDto)는 features/itinerary(usePlacesQuery 단일 소스) 재사용.
 */
export type SortKey = "recent" | "name";

export const SORT_LABEL: Record<SortKey, string> = {
  recent: "최근 저장순",
  name: "이름순",
};

/** 가상 "전체 장소" 폴더 키. */
export const ALL_FOLDER = "all";

/** 가상 "전체 도시" 필터 키(다중 도시 Phase 4) — 도시 축을 안 좁힘. */
export const ALL_CITIES = "all-cities";
