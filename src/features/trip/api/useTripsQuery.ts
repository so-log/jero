"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import type { TripDto } from "@/features/itinerary";

import type { TripSummaryDto } from "../types";
import { TRIPS_FIXTURE } from "./fixtures";

/**
 * 목록 ↔ 상세 쿼리 키 정리:
 *   - ['trips']      → 내 여행 목록(02). useTripsQuery
 *   - ['trip', id]   → 단일 여행 상세 헤더(워크스페이스 셸). useTripQuery
 * 카드 클릭 → 상세 진입 시 목록 요약으로 ['trip', id] 를 미리 채워(seed) 헤더가 즉시 렌더된다(캐시 연속성).
 * 컴포넌트 직접 fetch 금지(§7.1) — TODO(supabase): queryFn 을 RLS select(내가 멤버인 trip만, §8.2)로 교체.
 */
export function useTripsQuery() {
  return useQuery<TripSummaryDto[]>({
    queryKey: ["trips"],
    queryFn: () => TRIPS_FIXTURE,
  });
}

/** 요약 → 상세(TripDto) 투영. seed·standalone fallback 공용. */
function toTripDto(summary: TripSummaryDto): TripDto {
  return {
    id: summary.id,
    title: summary.title,
    start_date: summary.start_date,
    end_date: summary.end_date,
    my_role: summary.my_role,
    cover_icon: summary.cover_icon,
  };
}

export function useTripQuery(tripId: string) {
  return useQuery<TripDto>({
    queryKey: ["trip", tripId],
    // 연동 전: 목록 fixture 에서 해당 여행을 찾아 상세로 투영(seed 가 있으면 그 캐시 사용).
    queryFn: () => {
      const found = TRIPS_FIXTURE.find((t) => t.id === tripId);
      if (found) return toTripDto(found);
      // fixture 에 없으면 데모 기본값(워크스페이스 단독 진입 대비).
      return toTripDto(TRIPS_FIXTURE[0]);
    },
  });
}

/** 목록 로드 후 각 여행의 ['trip', id] 캐시를 채워 상세 진입 시 헤더를 즉시 표시. */
export function useSeedTripDetails(trips: TripSummaryDto[] | undefined) {
  const queryClient = useQueryClient();
  useEffect(() => {
    for (const t of trips ?? []) {
      if (!queryClient.getQueryData(["trip", t.id])) {
        queryClient.setQueryData(["trip", t.id], toTripDto(t));
      }
    }
  }, [trips, queryClient]);
}
