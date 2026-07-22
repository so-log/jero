"use client";

import { useMemo } from "react";

import {
  citySchedule,
  useTripCities,
  type CitySegment,
  type TripCity,
} from "@/features/trip";

import { toCityViews, type CityView } from "../lib/citySelectors";

/**
 * 다중 도시 스케줄 훅(다중 도시 Phase 3) — 도시 목록(useTripCities, 서버상태)을 여행 시작일 기준
 * 파생 날짜 구간(citySchedule)으로 투영. 컴포넌트 직접 fetch 금지(§7.1) — 트립 도메인 훅 경유.
 *
 * ★ isMulti(=cities.length>1)에서만 도시 UI 노출. 도시 0/1개(또는 키 없음)면 기존 단일 도시 UX 와 동일(회귀 0).
 */
export interface TripCitySchedule {
  cities: TripCity[];
  schedule: CitySegment[];
  /** 도시 탭·라벨 뷰모델(seq 순). */
  cityViews: CityView[];
  /** 다중 도시 여부 — 도시 UI 분기 게이트. */
  isMulti: boolean;
}

export function useCitySchedule(
  tripId: string,
  tripStart: string | undefined,
): TripCitySchedule {
  const { data: cities = [] } = useTripCities(tripId);
  return useMemo(() => {
    const schedule = tripStart ? citySchedule(cities, tripStart) : [];
    return {
      cities,
      schedule,
      cityViews: toCityViews(cities, schedule),
      isMulti: cities.length > 1,
    };
  }, [cities, tripStart]);
}
