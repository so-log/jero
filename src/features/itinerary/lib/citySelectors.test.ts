import { describe, expect, it } from "vitest";

import { citySchedule, type TripCity } from "@/features/trip";

import {
  cityForDay,
  firstDayIndexOfCity,
  positionsForCity,
  toCityViews,
} from "./citySelectors";
import { deriveDays } from "./selectors";
import type { PlaceDto } from "../types";

/** 도쿄 2박 → 오사카 1박(마지막). 여행 4/18~4/21(총 3박 4일). */
const CITIES: TripCity[] = [
  { id: "c-tokyo", name: "도쿄", country: "일본", lat: 35.68, lng: 139.76, nights: 2, seq: 0 },
  { id: "c-osaka", name: "오사카", country: "일본", lat: null, lng: null, nights: 1, seq: 1 },
];
const TRIP_START = "2026-04-18";
const SCHEDULE = citySchedule(CITIES, TRIP_START);

function place(id: string, date: string, lat: number | null, lng: number | null): PlaceDto {
  return {
    id,
    name: id,
    category: "etc",
    scheduled_date: date,
    order_in_day: 1,
    start_time: null,
    duration_min: null,
    memo: null,
    lat,
    lng,
  };
}

describe("citySelectors", () => {
  it("cityForDay: 날짜가 속한 도시 + 첫날 여부", () => {
    expect(cityForDay(SCHEDULE, "2026-04-18")).toMatchObject({
      isCityStart: true,
    });
    expect(cityForDay(SCHEDULE, "2026-04-18")?.segment.name).toBe("도쿄");
    expect(cityForDay(SCHEDULE, "2026-04-19")).toMatchObject({
      isCityStart: false,
    });
    // 오사카 첫날 = 4/20(도쿄 2박 소진 후)
    expect(cityForDay(SCHEDULE, "2026-04-20")).toMatchObject({
      isCityStart: true,
    });
    expect(cityForDay(SCHEDULE, "2026-04-20")?.segment.name).toBe("오사카");
  });

  it("cityForDay: 범위 밖·미지정 → null", () => {
    expect(cityForDay(SCHEDULE, "2026-04-30")).toBeNull();
    expect(cityForDay(SCHEDULE, undefined)).toBeNull();
  });

  it("firstDayIndexOfCity: 도시 첫 Day 인덱스", () => {
    const days = deriveDays("2026-04-18", "2026-04-21");
    expect(firstDayIndexOfCity(days, SCHEDULE[0])).toBe(0); // 도쿄 → Day1
    expect(firstDayIndexOfCity(days, SCHEDULE[1])).toBe(2); // 오사카 → Day3
  });

  it("positionsForCity: 도시 날짜 구간의 좌표 있는 장소만", () => {
    const places = [
      place("a", "2026-04-18", 35.6, 139.7),
      place("b", "2026-04-19", null, null), // 좌표 없음 → 제외
      place("c", "2026-04-20", 34.6, 135.5), // 오사카
    ];
    expect(positionsForCity(places, SCHEDULE[0])).toEqual([
      { lat: 35.6, lng: 139.7 },
    ]);
    expect(positionsForCity(places, SCHEDULE[1])).toEqual([
      { lat: 34.6, lng: 135.5 },
    ]);
  });

  it("toCityViews: 세그먼트에 원본 박수·좌표 결합", () => {
    const views = toCityViews(CITIES, SCHEDULE);
    expect(views).toHaveLength(2);
    expect(views[0]).toMatchObject({ name: "도쿄", nights: 2, seq: 0, lat: 35.68 });
    expect(views[1]).toMatchObject({ name: "오사카", nights: 1, seq: 1, lat: null });
  });
});
