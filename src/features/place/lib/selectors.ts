import type { SavedMarker } from "@/components/map";
import type { CityView } from "@/features/itinerary";
import type { PlaceDto } from "@/features/itinerary";

import { ALL_CITIES, ALL_FOLDER, type SortKey } from "../types";

/**
 * 장소(06) 순수 셀렉터 — 저장 장소(scheduled_date=null) 단일 소스를 도시·폴더·검색·정렬로 투영(설계 §6).
 * 04와 동일 PlaceDto 를 재사용한다(중복 fetch·중복 정의 금지, §7.2).
 * 도시 축(Phase 4)은 폴더·카테고리와 독립인 3번째 필터 — 라벨로 명확히 구분(U2 IA 교훈).
 */

export function placesInFolder(saved: PlaceDto[], folderId: string): PlaceDto[] {
  return folderId === ALL_FOLDER
    ? saved
    : saved.filter((p) => p.folder_id === folderId);
}

export function folderCount(saved: PlaceDto[], folderId: string): number {
  return placesInFolder(saved, folderId).length;
}

/** 도시 필터(다중 도시 Phase 4) — ALL_CITIES 면 전체, 아니면 그 도시(city_id) 장소만. */
export function placesInCity(saved: PlaceDto[], cityId: string): PlaceDto[] {
  return cityId === ALL_CITIES
    ? saved
    : saved.filter((p) => p.city_id === cityId);
}

/** 도시별 장소 수(사이드바·범례 뱃지). */
export function cityCount(saved: PlaceDto[], cityId: string): number {
  return placesInCity(saved, cityId).length;
}

/** 미배정(city_id null) 장소 수 — 다중 도시에서 "미배정" 안내용. */
export function unassignedCityCount(saved: PlaceDto[]): number {
  return saved.filter((p) => p.city_id == null).length;
}

/** "전체 도시" 그룹 뷰(Phase 4) — 도시(seq 순) 섹션 + 마지막에 미배정 섹션. 빈 섹션은 제외. */
export interface CityGroup {
  /** 도시(cityViews) 또는 null(미배정 그룹). */
  city: CityView | null;
  places: PlaceDto[];
}

export function groupByCity(
  places: PlaceDto[],
  cities: CityView[],
): CityGroup[] {
  const groups: CityGroup[] = cities
    .map((city) => ({
      city,
      places: places.filter((p) => p.city_id === city.id),
    }))
    .filter((g) => g.places.length > 0);
  const unassigned = places.filter(
    (p) => p.city_id == null || !cities.some((c) => c.id === p.city_id),
  );
  if (unassigned.length > 0) groups.push({ city: null, places: unassigned });
  return groups;
}

export function filterBySearch(places: PlaceDto[], query: string): PlaceDto[] {
  const q = query.trim().toLowerCase();
  if (!q) return places;
  return places.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      (p.area ?? "").toLowerCase().includes(q),
  );
}

export function sortPlaces(places: PlaceDto[], sort: SortKey): PlaceDto[] {
  if (sort === "name")
    return [...places].sort((a, b) => a.name.localeCompare(b.name, "ko"));
  return places; // recent = 저장 순(fixture 순서 = 최근 저장순 가정)
}

/** 좌표 있는 저장 장소 → 미니맵 다이아 마커(04 SavedMarker 재사용). */
export function toSavedMapMarkers(places: PlaceDto[]): SavedMarker[] {
  return places
    .filter((p) => p.lat != null && p.lng != null)
    .map((p) => ({
      id: p.id,
      position: { lat: p.lat as number, lng: p.lng as number },
      category: p.category,
    }));
}
