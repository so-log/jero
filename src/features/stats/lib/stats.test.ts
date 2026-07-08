import { describe, expect, it } from "vitest";

import type { PlaceDto } from "@/features/itinerary";

import { computeTripStats, haversineKm } from "./stats";

const trip = { start_date: "2026-08-01", end_date: "2026-08-02" }; // 2일

function place(p: Partial<PlaceDto> & { id: string }): PlaceDto {
  return {
    name: p.id,
    category: "museum",
    scheduled_date: null,
    order_in_day: null,
    start_time: null,
    duration_min: null,
    memo: null,
    lat: null,
    lng: null,
    ...p,
  };
}

describe("haversineKm", () => {
  it("서울↔부산 ≈ 325km (±5)", () => {
    const km = haversineKm({ lat: 37.5665, lng: 126.978 }, { lat: 35.1796, lng: 129.0756 });
    expect(km).toBeGreaterThan(320);
    expect(km).toBeLessThan(330);
  });
});

describe("computeTripStats", () => {
  it("연속 일정 좌표 Haversine 합으로 이동거리 계산(좌표 없는 장소 제외)", () => {
    const places: PlaceDto[] = [
      place({ id: "a", scheduled_date: "2026-08-01", order_in_day: 1, lat: 35.0, lng: 139.0 }),
      place({ id: "b", scheduled_date: "2026-08-01", order_in_day: 2, lat: 35.1, lng: 139.0 }),
      // 좌표 없는 장소 — 거리 계산 제외(연결 유지: a→b→(skip)→c 는 없음, 여기선 b가 끝)
      place({ id: "nocoord", scheduled_date: "2026-08-01", order_in_day: 3 }),
    ];
    const s = computeTripStats(places, trip);
    // a→b ≈ 11.1km (위도 0.1도)
    expect(s.perDay[0].km).toBeGreaterThan(10);
    expect(s.perDay[0].km).toBeLessThan(12);
    expect(s.perDay[0].count).toBe(3); // 개수엔 좌표없는 것도 포함
    expect(s.totalDistanceKm).toBe(s.perDay[0].km);
    expect(s.perDay).toHaveLength(2); // 2일
    expect(s.perDay[1].km).toBe(0);
  });

  it("카테고리 분포(내림차순 + %)와 장소 수·하루 평균", () => {
    const places: PlaceDto[] = [
      place({ id: "1", scheduled_date: "2026-08-01", order_in_day: 1, category: "food" }),
      place({ id: "2", scheduled_date: "2026-08-01", order_in_day: 2, category: "food" }),
      place({ id: "3", scheduled_date: "2026-08-02", order_in_day: 1, category: "cafe" }),
      place({ id: "4", scheduled_date: "2026-08-02", order_in_day: 2, category: "food", area: "시부야" }),
    ];
    const s = computeTripStats(places, trip);
    expect(s.placeCount).toBe(4);
    expect(s.tripDays).toBe(2);
    expect(s.avgPerDay).toBe(2);
    expect(s.byCategory[0]).toEqual({ category: "food", count: 3, pct: 75 });
    expect(s.byCategory[1]).toEqual({ category: "cafe", count: 1, pct: 25 });
    expect(s.byArea).toEqual([{ area: "시부야", count: 1 }]);
  });

  it("빈 케이스(일정 0) — 거리 0, 분포 빈 배열", () => {
    const s = computeTripStats([], trip);
    expect(s.totalDistanceKm).toBe(0);
    expect(s.placeCount).toBe(0);
    expect(s.byCategory).toEqual([]);
    expect(s.byArea).toEqual([]);
    expect(s.avgPerDay).toBe(0);
    expect(s.perDay.every((d) => d.km === 0 && d.count === 0)).toBe(true);
  });
});
