import { isPast } from "@/lib/tripDate";

import type { TripFilter, TripSummaryDto } from "../types";

/**
 * 02 목록 순수 셀렉터 — 검색 필터 + 예정/지난 그룹핑. "오늘"(todayISO)을 인자로 받아 순수 유지.
 */

export function filterBySearch(
  trips: TripSummaryDto[],
  query: string,
): TripSummaryDto[] {
  const q = query.trim().toLowerCase();
  if (!q) return trips;
  return trips.filter((t) => t.search_text.toLowerCase().includes(q));
}

export interface TripGroup {
  key: "upcoming" | "past";
  label: string;
  trips: TripSummaryDto[];
}

/** 정렬: 예정=출발 가까운 순, 지난=최근 종료 순(최근 출발 순 기준). */
function byStartAsc(a: TripSummaryDto, b: TripSummaryDto) {
  return a.start_date.localeCompare(b.start_date);
}
function byStartDesc(a: TripSummaryDto, b: TripSummaryDto) {
  return b.start_date.localeCompare(a.start_date);
}

/** 필터에 따라 예정/지난 그룹 구성. 빈 그룹은 제외(설계 §5). */
export function groupTrips(
  trips: TripSummaryDto[],
  filter: TripFilter,
  todayISO: string,
): TripGroup[] {
  const upcoming = trips
    .filter((t) => !isPast(t.end_date, todayISO))
    .sort(byStartAsc);
  const past = trips.filter((t) => isPast(t.end_date, todayISO)).sort(byStartDesc);

  const groups: TripGroup[] = [];
  if (filter === "upcoming" || filter === "all") {
    groups.push({ key: "upcoming", label: "예정된 여행", trips: upcoming });
  }
  if (filter === "past" || filter === "all") {
    groups.push({ key: "past", label: "지난 여행", trips: past });
  }
  return groups.filter((g) => g.trips.length > 0);
}

/** 요약 부제: "N개의 여행 · 예정 N · 지난 N". */
export function tripsSummaryText(
  trips: TripSummaryDto[],
  todayISO: string,
): string {
  const past = trips.filter((t) => isPast(t.end_date, todayISO)).length;
  return `${trips.length}개의 여행 · 예정 ${trips.length - past} · 지난 ${past}`;
}
