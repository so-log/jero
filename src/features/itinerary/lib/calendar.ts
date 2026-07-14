import type { CategoryKey } from "@/lib/constants/category";

import type { PlaceDto } from "../types";

/**
 * 일정표(05) 순수 셀렉터 — 04와 같은 PlaceDto 소스를 시간 축(월/주/일)으로 투영(설계 §6).
 * 색은 컴포넌트에서 카테고리 토큰으로 입힌다(셀렉터는 카테고리 키만 반환).
 * 날짜는 'YYYY-MM-DD' 문자열 + UTC 자정 기준으로 다뤄 로컬 타임존 영향 차단(설계 §11).
 */
export const WEEKDAYS_KR = ["일", "월", "화", "수", "목", "금", "토"] as const;

function toUTC(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  return toISO(new Date(toUTC(iso).getTime() + n * 86_400_000));
}

export function addMonths(iso: string, n: number): string {
  const d = toUTC(iso);
  const total = d.getUTCFullYear() * 12 + d.getUTCMonth() + n;
  const y = Math.floor(total / 12);
  const m = total % 12;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const day = Math.min(d.getUTCDate(), lastDay);
  return toISO(new Date(Date.UTC(y, m, day)));
}

export function weekdayKR(iso: string): string {
  return WEEKDAYS_KR[toUTC(iso).getUTCDay()];
}

/** "HH:MM" → 소수 시각(13:30 → 13.5). 없으면 null. */
export function timeToHours(time: string | null): number | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  return h + m / 60;
}

/** 소수 시각 → "HH:MM". */
export function hoursToTime(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** 날짜별 일정 그룹(시작 시각 순). 04·05 동일 소스를 날짜 키로 인덱싱. */
export function placesByDate(places: PlaceDto[]): Map<string, PlaceDto[]> {
  const map = new Map<string, PlaceDto[]>();
  for (const p of places) {
    if (!p.scheduled_date) continue;
    const list = map.get(p.scheduled_date) ?? [];
    list.push(p);
    map.set(p.scheduled_date, list);
  }
  for (const list of map.values()) {
    list.sort(
      (a, b) =>
        (timeToHours(a.start_time) ?? 0) - (timeToHours(b.start_time) ?? 0),
    );
  }
  return map;
}

function inRange(iso: string, start: string, end: string): boolean {
  return iso >= start && iso <= end; // ISO 문자열 사전순 = 날짜순
}

export interface MonthCell {
  date: string;
  /** 월중 일(day-of-month). */
  day: number;
  inMonth: boolean;
  isTrip: boolean;
  /** 도트용 카테고리(최대 4). */
  categories: CategoryKey[];
  count: number;
}

/** 월 그리드 — 앞뒤 달로 주 단위(7) 채움. 주 수는 4~6 가변. */
export function buildMonthGrid(
  cursorISO: string,
  byDate: Map<string, PlaceDto[]>,
  tripStart: string,
  tripEnd: string,
): MonthCell[][] {
  const cursor = toUTC(cursorISO);
  const year = cursor.getUTCFullYear();
  const month = cursor.getUTCMonth();
  const first = new Date(Date.UTC(year, month, 1));
  const leading = first.getUTCDay(); // 0=일요일 시작
  const start = new Date(first.getTime() - leading * 86_400_000);
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const totalCells = Math.ceil((leading + daysInMonth) / 7) * 7;

  const cells: MonthCell[] = [];
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(start.getTime() + i * 86_400_000);
    const iso = toISO(d);
    const list = byDate.get(iso) ?? [];
    cells.push({
      date: iso,
      day: d.getUTCDate(),
      inMonth: d.getUTCMonth() === month,
      isTrip: inRange(iso, tripStart, tripEnd),
      categories: list.slice(0, 4).map((p) => p.category),
      count: list.length,
    });
  }

  const weeks: MonthCell[][] = [];
  for (let w = 0; w < cells.length; w += 7) weeks.push(cells.slice(w, w + 7));
  return weeks;
}

/** 주 7일 — cursor 부터 7일(트립 첫날 기준 연속 주). */
export function buildWeekDays(cursorISO: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(cursorISO, i));
}

/**
 * 모바일 7일 스트립 앵커(반응형 3-C) — 여행 첫날 기준으로 주를 타일링해 cursor 가 속한 주의 시작 반환.
 * 일요일 정렬 대신 트립 앵커라 여행 기간(≤7일)이 한 스트립에 모여 보인다(주 경계로 잘리지 않음).
 */
export function tripWeekStart(cursorISO: string, tripStartISO: string): string {
  const diffDays = Math.round(
    (toUTC(cursorISO).getTime() - toUTC(tripStartISO).getTime()) / 86_400_000,
  );
  return addDays(tripStartISO, Math.floor(diffDays / 7) * 7);
}

/** 월중 일(day-of-month) 숫자. */
export function dayOfMonth(iso: string): number {
  return toUTC(iso).getUTCDate();
}

/** 요일 인덱스(0=일 … 6=토) — 스트립 셀 주말 색 구분용. */
export function weekdayIndex(iso: string): number {
  return toUTC(iso).getUTCDay();
}

/** 라벨 — 월/주/일 모드별 기간 표기. */
export function monthLabel(iso: string): string {
  const d = toUTC(iso);
  return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월`;
}

export function dayLabel(iso: string): string {
  const d = toUTC(iso);
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 ${weekdayKR(iso)}요일`;
}

export function weekLabel(cursorISO: string): string {
  const end = addDays(cursorISO, 6);
  const s = toUTC(cursorISO);
  const e = toUTC(end);
  const sLabel = `${s.getUTCMonth() + 1}월 ${s.getUTCDate()}일`;
  const eLabel =
    s.getUTCMonth() === e.getUTCMonth()
      ? `${e.getUTCDate()}일`
      : `${e.getUTCMonth() + 1}월 ${e.getUTCDate()}일`;
  return `${sLabel} – ${eLabel}`;
}

/** 주/일 타임라인 시간 범위(시안: 08–20, 시간당 42px). */
export const TIMELINE = { startH: 8, endH: 20, hourH: 42 } as const;

/** 주 모드 이벤트 블록 — 위치/높이(px)는 시작 시각·소요 시간에서 파생. */
export interface PlaceDtoBlock {
  place: PlaceDto;
  top: number;
  height: number;
}
