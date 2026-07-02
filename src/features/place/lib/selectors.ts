import type { SavedMarker } from "@/components/map";
import type { PlaceDto } from "@/features/itinerary";

import { ALL_FOLDER, type SortKey } from "../types";

/**
 * 장소(06) 순수 셀렉터 — 저장 장소(scheduled_date=null) 단일 소스를 폴더·검색·정렬로 투영(설계 §6).
 * 04와 동일 PlaceDto 를 재사용한다(중복 fetch·중복 정의 금지, §7.2).
 */

export function placesInFolder(saved: PlaceDto[], folderId: string): PlaceDto[] {
  return folderId === ALL_FOLDER
    ? saved
    : saved.filter((p) => p.folder_id === folderId);
}

export function folderCount(saved: PlaceDto[], folderId: string): number {
  return placesInFolder(saved, folderId).length;
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
