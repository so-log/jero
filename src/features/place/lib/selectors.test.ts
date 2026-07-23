import { describe, expect, it } from "vitest";

import { PLAN_FIXTURE, type CityView, type PlaceDto } from "@/features/itinerary";

import {
  cityCount,
  filterBySearch,
  folderCount,
  groupByCity,
  placesInCity,
  placesInFolder,
  sortPlaces,
  toSavedMapMarkers,
  unassignedCityCount,
} from "./selectors";
import { ALL_CITIES } from "../types";

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

// ── 다중 도시(Phase 4) 도시 축 셀렉터 ──
function cityPlace(id: string, cityId: string | null): PlaceDto {
  return {
    id,
    name: id,
    category: "etc",
    scheduled_date: null,
    order_in_day: null,
    start_time: null,
    duration_min: null,
    memo: null,
    lat: null,
    lng: null,
    city_id: cityId,
  };
}
const CITY_VIEWS: CityView[] = [
  { id: "c-tokyo", name: "도쿄", seq: 0, nights: 2, startDate: "2026-04-18", endDate: "2026-04-19", lat: null, lng: null, country: "일본" },
  { id: "c-osaka", name: "오사카", seq: 1, nights: 1, startDate: "2026-04-20", endDate: "2026-04-21", lat: null, lng: null, country: "일본" },
];
const CITY_SAVED = [
  cityPlace("t1", "c-tokyo"),
  cityPlace("t2", "c-tokyo"),
  cityPlace("o1", "c-osaka"),
  cityPlace("u1", null),
];

describe("placesInCity / cityCount / unassignedCityCount", () => {
  it("ALL_CITIES 는 전체, 특정 도시는 city_id 일치", () => {
    expect(placesInCity(CITY_SAVED, ALL_CITIES)).toHaveLength(4);
    expect(placesInCity(CITY_SAVED, "c-tokyo").map((p) => p.id)).toEqual([
      "t1",
      "t2",
    ]);
    expect(cityCount(CITY_SAVED, "c-osaka")).toBe(1);
    expect(unassignedCityCount(CITY_SAVED)).toBe(1);
  });
});

describe("groupByCity", () => {
  it("도시(seq 순) 섹션 + 미배정 끝, 빈 섹션 제외", () => {
    const groups = groupByCity(CITY_SAVED, CITY_VIEWS);
    expect(groups.map((g) => g.city?.name ?? "미배정")).toEqual([
      "도쿄",
      "오사카",
      "미배정",
    ]);
    expect(groups[0].places).toHaveLength(2);
    expect(groups[2].city).toBeNull();
  });

  it("장소 없는 도시는 그룹에서 빠진다", () => {
    const onlyTokyo = [cityPlace("t1", "c-tokyo")];
    const groups = groupByCity(onlyTokyo, CITY_VIEWS);
    expect(groups).toHaveLength(1);
    expect(groups[0].city?.name).toBe("도쿄");
  });

  it("알 수 없는 city_id 는 미배정으로 묶인다", () => {
    const groups = groupByCity([cityPlace("x", "c-ghost")], CITY_VIEWS);
    expect(groups).toHaveLength(1);
    expect(groups[0].city).toBeNull();
  });
});
