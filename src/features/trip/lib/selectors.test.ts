import { describe, expect, it } from "vitest";

import type { TripSummaryDto } from "../types";
import { groupTrips } from "./selectors";

/**
 * 02 목록 정렬(감사 A) — groupTrips 의 sort 인자(출발일 순 기본 / 생성순).
 * "오늘"=2026-06-01 기준: A·B 예정, C 지난.
 */
const TODAY = "2026-06-01";

function trip(
  id: string,
  start: string,
  end: string,
  createdAt: string,
): TripSummaryDto {
  return {
    id,
    title: id,
    cover_color: "blue",
    cover_icon: "building",
    start_date: start,
    end_date: end,
    created_at: createdAt,
    my_role: "owner",
    member_avatars: [],
    place_count: 0,
    search_text: id,
  };
}

// 예정 A(출발 8/9, 생성 5월), 예정 B(출발 7/1, 생성 1월), 지난 C(출발 3/1, 생성 2월).
const A = trip("A", "2026-08-09", "2026-08-11", "2026-05-01T00:00:00Z");
const B = trip("B", "2026-07-01", "2026-07-03", "2026-01-01T00:00:00Z");
const C = trip("C", "2026-03-01", "2026-03-03", "2026-02-01T00:00:00Z");
const TRIPS = [A, B, C];

describe("groupTrips 정렬", () => {
  it("기본(출발일 순): 예정=임박순(B,A), 지난=최근순", () => {
    const groups = groupTrips(TRIPS, "all", TODAY); // sort 기본
    const upcoming = groups.find((g) => g.key === "upcoming")!;
    expect(upcoming.trips.map((t) => t.id)).toEqual(["B", "A"]); // 7/1 먼저
  });

  it("생성순: 예정을 최근 생성 순으로(A 5월 > B 1월)", () => {
    const groups = groupTrips(TRIPS, "all", TODAY, "created");
    const upcoming = groups.find((g) => g.key === "upcoming")!;
    expect(upcoming.trips.map((t) => t.id)).toEqual(["A", "B"]); // 생성 최신 먼저
  });

  it("생성순: created_at 없으면 출발일로 폴백(크래시 없음)", () => {
    const noCreated = { ...B, created_at: undefined };
    const groups = groupTrips([A, noCreated], "upcoming", TODAY, "created");
    // A(created 5월) vs B(폴백 출발 7/1) → 문자열 비교라도 정렬 자체는 수행됨(예외 없음)
    expect(groups[0].trips).toHaveLength(2);
  });
});
