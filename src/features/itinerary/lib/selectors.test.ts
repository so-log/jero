import { describe, expect, it } from "vitest";

import { PLAN_FIXTURE } from "../api/fixtures";
import {
  deriveDays,
  filterByCategory,
  placesForDay,
  reorderDayPlaces,
  toSavedMarkers,
  toScheduledMarkers,
} from "./selectors";

/** 04 플랜 순수 셀렉터 — 일정/저장 장소 분리·날짜 파생·마커 투영. fixture(§7.2) 재사용. */
describe("deriveDays", () => {
  it("기간에서 Day 목록 파생(라벨·요일)", () => {
    const days = deriveDays("2026-04-18", "2026-04-21");
    expect(days).toHaveLength(4);
    expect(days[0].label).toBe("Day 1");
    expect(days.map((d) => d.weekday)).toEqual(["토", "일", "월", "화"]);
  });
});

describe("placesForDay — 선택 날짜의 일정 장소만, order 순", () => {
  it("scheduled_date 일치 + order_in_day 정렬", () => {
    const day1 = placesForDay(PLAN_FIXTURE.places, "2026-04-18");
    expect(day1.length).toBeGreaterThan(0);
    expect(day1.every((p) => p.scheduled_date === "2026-04-18")).toBe(true);
    const orders = day1.map((p) => p.order_in_day ?? 0);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(day1[0].name).toBe("츠키지 장외시장");
  });
});

describe("toScheduledMarkers / toSavedMarkers — 좌표 있는 것만, 번호 부여", () => {
  it("일정 마커는 1-based order", () => {
    const day1 = placesForDay(PLAN_FIXTURE.places, "2026-04-18");
    const markers = toScheduledMarkers(day1);
    expect(markers[0].order).toBe(1);
    expect(markers.at(-1)?.order).toBe(markers.length);
    expect(markers.every((m) => Number.isFinite(m.position.lat))).toBe(true);
  });
  it("저장 마커는 좌표 있는 저장 장소", () => {
    const saved = toSavedMarkers(PLAN_FIXTURE.saved_places);
    expect(saved.length).toBe(PLAN_FIXTURE.saved_places.length);
    expect(saved.every((m) => m.position.lng !== undefined)).toBe(true);
  });
});

describe("filterByCategory", () => {
  it("'all' 은 전체, 카테고리는 해당만", () => {
    const day1 = placesForDay(PLAN_FIXTURE.places, "2026-04-18");
    expect(filterByCategory(day1, "all")).toHaveLength(day1.length);
    const museum = filterByCategory(day1, "museum");
    expect(museum.every((p) => p.category === "museum")).toBe(true);
  });
});

describe("reorderDayPlaces — 드래그 재정렬(order_in_day 재부여)", () => {
  const DATE = "2026-04-18";

  it("orderedIds 순서대로 order_in_day 를 1-based 로 재부여한다", () => {
    const before = placesForDay(PLAN_FIXTURE.places, DATE).map((p) => p.id);
    // 첫 항목을 맨 뒤로 보낸다: [a,b,c,d,e] → [b,c,d,e,a]
    const next = [...before.slice(1), before[0]];
    const result = reorderDayPlaces(PLAN_FIXTURE, DATE, next);
    const after = placesForDay(result.places, DATE);
    expect(after.map((p) => p.id)).toEqual(next);
    expect(after.map((p) => p.order_in_day)).toEqual([1, 2, 3, 4, 5]);
  });

  it("원본을 변형하지 않고(불변) 다른 날짜 장소는 그대로 둔다", () => {
    const before = placesForDay(PLAN_FIXTURE.places, DATE).map((p) => p.id);
    const day2Before = placesForDay(PLAN_FIXTURE.places, "2026-04-19");
    const result = reorderDayPlaces(PLAN_FIXTURE, DATE, [
      ...before.slice(1),
      before[0],
    ]);
    // 원본 fixture 순서는 유지(불변)
    expect(placesForDay(PLAN_FIXTURE.places, DATE).map((p) => p.id)).toEqual(
      before,
    );
    // Day2 는 영향 없음
    expect(placesForDay(result.places, "2026-04-19")).toEqual(day2Before);
  });
});
