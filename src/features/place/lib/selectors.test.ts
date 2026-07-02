import { describe, expect, it } from "vitest";

import { PLAN_FIXTURE } from "@/features/itinerary";

import {
  filterBySearch,
  folderCount,
  placesInFolder,
  sortPlaces,
  toSavedMapMarkers,
} from "./selectors";

/** 06 장소 순수 셀렉터 — 폴더/검색/정렬 투영. */
const saved = PLAN_FIXTURE.saved_places;

describe("placesInFolder / folderCount", () => {
  it("'all' 전체, 특정 폴더는 folder_id 일치", () => {
    expect(placesInFolder(saved, "all")).toHaveLength(saved.length);
    const food = placesInFolder(saved, "f-food");
    expect(food.every((p) => p.folder_id === "f-food")).toBe(true);
    expect(folderCount(saved, "f-food")).toBe(food.length);
  });
});

describe("filterBySearch — 이름·지역", () => {
  it("검색어 부분일치(소문자)", () => {
    expect(filterBySearch(saved, "이치란").length).toBe(1);
    expect(filterBySearch(saved, "시부야").length).toBeGreaterThan(0); // area 매칭
    expect(filterBySearch(saved, "").length).toBe(saved.length);
  });
});

describe("sortPlaces", () => {
  it("name 정렬은 가나다 순, recent 는 원순서 유지", () => {
    const byName = sortPlaces(saved, "name");
    const names = byName.map((p) => p.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "ko")));
    expect(sortPlaces(saved, "recent")).toEqual(saved);
  });
});

describe("toSavedMapMarkers", () => {
  it("좌표 있는 저장 장소만 마커로", () => {
    const markers = toSavedMapMarkers(saved);
    expect(markers.length).toBe(saved.filter((p) => p.lat != null).length);
  });
});
