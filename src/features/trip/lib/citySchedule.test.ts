import { describe, expect, it } from "vitest";

import { citySchedule, cityForDate, type TripCity } from "./citySchedule";

/** 다중 도시 날짜 파생 — 박수→구간, 마지막 +1일(end_date), 단일 도시 하위호환, cityForDate. */
const city = (id: string, nights: number, seq: number): TripCity => ({
  id,
  name: id,
  country: null,
  lat: null,
  lng: null,
  nights,
  seq,
});

describe("citySchedule", () => {
  it("단일 도시는 전체 여행을 덮는다(하위호환)", () => {
    // 8.1~8.3 = 2박(총 3일). 도시 1개(nights=2).
    const segs = citySchedule([city("c0", 2, 0)], "2026-08-01");
    expect(segs).toHaveLength(1);
    expect(segs[0]).toMatchObject({
      cityId: "c0",
      startDate: "2026-08-01",
      endDate: "2026-08-03", // 마지막 도시 = end_date
      dayCount: 3,
    });
  });

  it("다중 도시: 누적 구간·겹침 없음·마지막 endDate=end_date", () => {
    // 오사카 2박 + 교토 1박 = 3박(총 4일: 8.1~8.4).
    const segs = citySchedule([city("osaka", 2, 0), city("kyoto", 1, 1)], "2026-08-01");
    expect(segs.map((s) => [s.startDate, s.endDate, s.dayCount])).toEqual([
      ["2026-08-01", "2026-08-02", 2], // 오사카: day0,1
      ["2026-08-03", "2026-08-04", 2], // 교토: day2,3(+복귀일)
    ]);
    // 합 = 4일 = 총 박수(3) + 1
    expect(segs.reduce((a, s) => a + s.dayCount, 0)).toBe(4);
  });

  it("seq 순으로 정렬해 계산(입력 순서 무관)", () => {
    const segs = citySchedule([city("b", 1, 1), city("a", 2, 0)], "2026-08-01");
    expect(segs.map((s) => s.cityId)).toEqual(["a", "b"]);
  });

  it("당일치기(0박) 단일 도시 = 1일", () => {
    const segs = citySchedule([city("c0", 0, 0)], "2026-08-01");
    expect(segs[0]).toMatchObject({
      startDate: "2026-08-01",
      endDate: "2026-08-01",
      dayCount: 1,
    });
  });
});

describe("cityForDate", () => {
  const schedule = citySchedule(
    [city("osaka", 2, 0), city("kyoto", 1, 1)],
    "2026-08-01",
  );

  it("경계 포함 — 각 날짜의 도시", () => {
    expect(cityForDate(schedule, "2026-08-01")?.cityId).toBe("osaka");
    expect(cityForDate(schedule, "2026-08-02")?.cityId).toBe("osaka");
    expect(cityForDate(schedule, "2026-08-03")?.cityId).toBe("kyoto");
    expect(cityForDate(schedule, "2026-08-04")?.cityId).toBe("kyoto");
  });

  it("범위 밖이면 null", () => {
    expect(cityForDate(schedule, "2026-07-31")).toBeNull();
    expect(cityForDate(schedule, "2026-08-05")).toBeNull();
  });
});
