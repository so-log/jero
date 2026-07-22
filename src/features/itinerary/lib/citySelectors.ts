import type { LatLng } from "@/components/map";
import { cityForDate, type CitySegment, type TripCity } from "@/features/trip";

import type { Day, PlaceDto } from "../types";

/**
 * 다중 도시 화면 셀렉터(순수, 다중 도시 Phase 3) — 도시 세그먼트(파생 날짜)를 Day·장소·지도와 결합.
 * 부수효과 없음. 도시↔날짜 매핑은 저장된 날짜가 아니라 citySchedule 파생값(cityForDate)만 사용(단일 출처, 설계 §1.3·§4).
 * city_id 를 place 가 아직 안 실으므로(계약 additive) 도시-장소 관계는 날짜 구간으로 파생한다.
 */

/** 한 Day 가 속한 도시 + 그 도시의 첫날 여부(경계·배지용). 범위 밖이면 null. */
export interface DayCity {
  segment: CitySegment;
  isCityStart: boolean;
}

export function cityForDay(
  schedule: CitySegment[],
  date: string | undefined,
): DayCity | null {
  if (!date) return null;
  const segment = cityForDate(schedule, date);
  if (!segment) return null;
  return { segment, isCityStart: segment.startDate === date };
}

/** 도시(세그먼트)의 첫 Day 인덱스 — 도시 탭/드롭다운 클릭 시 그 도시 첫날로 점프. 없으면 -1. */
export function firstDayIndexOfCity(days: Day[], segment: CitySegment): number {
  return days.findIndex(
    (d) => d.date >= segment.startDate && d.date <= segment.endDate,
  );
}

/** 도시 날짜 구간에 속한(좌표 있는) 일정 장소 좌표 — 지도를 그 도시 장소 bounds 에 맞출 때(설계 §7). */
export function positionsForCity(
  places: PlaceDto[],
  segment: CitySegment,
): LatLng[] {
  return places
    .filter(
      (p) =>
        p.scheduled_date != null &&
        p.scheduled_date >= segment.startDate &&
        p.scheduled_date <= segment.endDate &&
        p.lat != null &&
        p.lng != null,
    )
    .map((p) => ({ lat: p.lat as number, lng: p.lng as number }));
}

/** 도시 탭·범례용 뷰모델 — 세그먼트(파생 날짜)에 원본 도시의 박수·좌표를 결합. */
export interface CityView {
  id: string;
  name: string;
  /** 순서(0-based) — 색 팔레트 인덱스. */
  seq: number;
  /** 박수(원본 trip_city). 파생 dayCount 와 구분(마지막 도시 dayCount = nights+1). */
  nights: number;
  startDate: string;
  endDate: string;
  lat: number | null;
  lng: number | null;
  country: string | null;
}

export function toCityViews(
  cities: TripCity[],
  schedule: CitySegment[],
): CityView[] {
  const byId = new Map(cities.map((c) => [c.id, c]));
  return schedule.map((seg) => {
    const city = byId.get(seg.cityId);
    return {
      id: seg.cityId,
      name: seg.name,
      seq: seg.seq,
      nights: city?.nights ?? Math.max(0, seg.dayCount - 1),
      startDate: seg.startDate,
      endDate: seg.endDate,
      lat: city?.lat ?? null,
      lng: city?.lng ?? null,
      country: city?.country ?? null,
    };
  });
}
