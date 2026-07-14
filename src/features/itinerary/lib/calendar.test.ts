import { describe, expect, it } from "vitest";

import type { PlaceDto } from "../types";
import {
  addDays,
  addMonths,
  buildMonthGrid,
  buildWeekDays,
  dayLabel,
  dayOfMonth,
  hoursToTime,
  monthLabel,
  placesByDate,
  timeToHours,
  tripWeekStart,
  weekLabel,
  weekdayIndex,
  weekdayKR,
} from "./calendar";

/** 05 일정표 순수 셀렉터 — UTC 기준 날짜 파생·시간 변환·월/주/일 투영. */
function place(p: Partial<PlaceDto> & { id: string }): PlaceDto {
  return {
    name: p.name ?? "장소",
    category: "food",
    scheduled_date: p.scheduled_date ?? null,
    order_in_day: p.order_in_day ?? null,
    start_time: p.start_time ?? null,
    duration_min: p.duration_min ?? null,
    memo: null,
    lat: null,
    lng: null,
    ...p,
  };
}

describe("timeToHours / hoursToTime", () => {
  it("HH:MM ↔ 소수 시각", () => {
    expect(timeToHours("13:30")).toBe(13.5);
    expect(timeToHours(null)).toBeNull();
    expect(hoursToTime(13.5)).toBe("13:30");
    expect(hoursToTime(9)).toBe("09:00");
  });
});

describe("addDays / addMonths — UTC, 월말 클램프", () => {
  it("일 더하기", () => {
    expect(addDays("2026-04-18", 3)).toBe("2026-04-21");
    expect(addDays("2026-04-30", 1)).toBe("2026-05-01");
  });
  it("월 더하기 + 말일 클램프", () => {
    expect(addMonths("2026-04-18", 1)).toBe("2026-05-18");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-04-18", -1)).toBe("2026-03-18");
  });
});

describe("weekdayKR — 여행 현지 기준 요일", () => {
  it("2026-04-18 = 토요일", () => {
    expect(weekdayKR("2026-04-18")).toBe("토");
    expect(weekdayKR("2026-04-19")).toBe("일");
  });
});

describe("labels — 월/주/일", () => {
  it("월/주/일 라벨", () => {
    expect(monthLabel("2026-04-15")).toBe("2026년 4월");
    expect(dayLabel("2026-04-18")).toBe("4월 18일 토요일");
    expect(weekLabel("2026-04-18")).toBe("4월 18일 – 24일");
  });
});

describe("placesByDate — 날짜별 그룹 + 시작 시각 정렬", () => {
  it("scheduled_date 키로 묶고 start_time 순", () => {
    const list = [
      place({ id: "b", scheduled_date: "2026-04-18", start_time: "13:00" }),
      place({ id: "a", scheduled_date: "2026-04-18", start_time: "09:00" }),
      place({ id: "x", scheduled_date: null }), // 미배정 제외
    ];
    const map = placesByDate(list);
    expect(map.get("2026-04-18")?.map((p) => p.id)).toEqual(["a", "b"]);
    expect(map.has("null")).toBe(false);
  });
});

describe("buildMonthGrid / buildWeekDays", () => {
  it("월 그리드는 7의 배수 셀 + 여행기간일 플래그", () => {
    const weeks = buildMonthGrid("2026-04-15", new Map(), "2026-04-18", "2026-04-21");
    const cells = weeks.flat();
    expect(cells.length % 7).toBe(0);
    const apr18 = cells.find((c) => c.date === "2026-04-18");
    expect(apr18?.isTrip).toBe(true);
    expect(apr18?.inMonth).toBe(true);
    const may2 = cells.find((c) => c.date === "2026-05-02");
    expect(may2?.inMonth).toBe(false);
  });
  it("주는 cursor 부터 7일", () => {
    expect(buildWeekDays("2026-04-18")).toEqual([
      "2026-04-18",
      "2026-04-19",
      "2026-04-20",
      "2026-04-21",
      "2026-04-22",
      "2026-04-23",
      "2026-04-24",
    ]);
  });

  it("tripWeekStart 는 여행 첫날 기준 주 앵커 (모바일 스트립, 3-C)", () => {
    const tripStart = "2026-04-18";
    // 여행 첫날 주: 04-18 자신이 앵커 → 트립(04-18~21) 전체가 한 스트립.
    expect(tripWeekStart("2026-04-18", tripStart)).toBe("2026-04-18");
    expect(tripWeekStart("2026-04-21", tripStart)).toBe("2026-04-18");
    expect(buildWeekDays(tripWeekStart("2026-04-20", tripStart))).toEqual([
      "2026-04-18",
      "2026-04-19",
      "2026-04-20",
      "2026-04-21",
      "2026-04-22",
      "2026-04-23",
      "2026-04-24",
    ]);
    // 다음 주·이전 주로 타일링.
    expect(tripWeekStart("2026-04-25", tripStart)).toBe("2026-04-25");
    expect(tripWeekStart("2026-04-11", tripStart)).toBe("2026-04-11");
  });

  it("dayOfMonth / weekdayIndex", () => {
    expect(dayOfMonth("2026-04-18")).toBe(18);
    expect(weekdayIndex("2026-04-19")).toBe(0); // 일
    expect(weekdayIndex("2026-04-18")).toBe(6); // 토
  });
});
