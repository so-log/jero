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

/** 목록 정렬 기준(감사 A) — 출발일 순(기본) / 생성(등록) 순. */
export type TripSortKey = "departure" | "created";

export const TRIP_SORT_LABEL: Record<TripSortKey, string> = {
  departure: "출발일 순",
  created: "생성순",
};

/** 정렬: 예정=출발 가까운 순, 지난=최근 종료 순(출발일 기준). */
function byStartAsc(a: TripSummaryDto, b: TripSummaryDto) {
  return a.start_date.localeCompare(b.start_date);
}
function byStartDesc(a: TripSummaryDto, b: TripSummaryDto) {
  return b.start_date.localeCompare(a.start_date);
}
/** 최근 생성(등록) 순 — created_at desc. 누락 시 출발일 desc 폴백. */
function byCreatedDesc(a: TripSummaryDto, b: TripSummaryDto) {
  const av = a.created_at ?? a.start_date;
  const bv = b.created_at ?? b.start_date;
  return bv.localeCompare(av);
}

/** 필터에 따라 예정/지난 그룹 구성. 빈 그룹은 제외(설계 §5). sort 로 그룹 내 정렬 기준 선택. */
export function groupTrips(
  trips: TripSummaryDto[],
  filter: TripFilter,
  todayISO: string,
  sort: TripSortKey = "departure",
): TripGroup[] {
  // 생성순이면 두 그룹 모두 최근 생성 순, 아니면 예정=임박순·지난=최근순(기본).
  const upcomingSort = sort === "created" ? byCreatedDesc : byStartAsc;
  const pastSort = sort === "created" ? byCreatedDesc : byStartDesc;
  const upcoming = trips
    .filter((t) => !isPast(t.end_date, todayISO))
    .sort(upcomingSort);
  const past = trips.filter((t) => isPast(t.end_date, todayISO)).sort(pastSort);

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
