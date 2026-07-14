"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { PlacesResponse, TripDto } from "@/features/itinerary";
import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/env";

import type { TripSummaryDto } from "../types";

/**
 * 여행 기간 수정 seam(B3) — trip.start_date·end_date update. owner 만 허용은 서버 RLS(trip_update)가 강제.
 * 클라 canEdit/역할은 UI 노출 분기일 뿐(§8.2, 신뢰 안 함).
 * 엣지: 새 기간을 벗어난 배정 장소(unassignPlaceIds)는 미배정(scheduled_date=null=저장만)으로 전환 → 데이터 유실 없음.
 * 낙관적으로 3개 캐시(['trip', id] 헤더 · ['trips'] 목록 · ['places', id] 플랜/캘린더)를 갱신, 성공 시 무효화.
 * env 가드: 키 없으면 네트워크 스킵(로컬 스텁도 캐시 갱신으로 반영).
 */
export interface UpdateTripInput {
  tripId: string;
  start_date: string;
  end_date: string;
  /** 새 기간을 벗어나 미배정 처리할 장소 id(없으면 기간만 변경). */
  unassignPlaceIds: string[];
}

interface Snapshot {
  trip?: TripDto;
  trips?: TripSummaryDto[];
  places?: PlacesResponse;
}

export function useUpdateTrip() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, UpdateTripInput, Snapshot>({
    mutationFn: async ({ tripId, start_date, end_date, unassignPlaceIds }) => {
      if (!hasSupabase) return;
      const supabase = createClient();
      const { error } = await supabase
        .from("trip")
        .update({ start_date, end_date })
        .eq("id", tripId);
      if (error) throw new Error("여행 날짜를 수정하지 못했어요.");
      if (unassignPlaceIds.length > 0) {
        const { error: unassignError } = await supabase
          .from("place")
          .update({ scheduled_date: null, order_in_day: null, scheduled_by: null })
          .in("id", unassignPlaceIds);
        if (unassignError) throw new Error("일부 장소를 미배정하지 못했어요.");
      }
    },
    onMutate: async ({ tripId, start_date, end_date, unassignPlaceIds }) => {
      const tripKey = ["trip", tripId];
      const placesKey = ["places", tripId];
      await Promise.all([
        queryClient.cancelQueries({ queryKey: tripKey }),
        queryClient.cancelQueries({ queryKey: placesKey }),
        queryClient.cancelQueries({ queryKey: ["trips"] }),
      ]);

      const snapshot: Snapshot = {
        trip: queryClient.getQueryData<TripDto>(tripKey),
        trips: queryClient.getQueryData<TripSummaryDto[]>(["trips"]),
        places: queryClient.getQueryData<PlacesResponse>(placesKey),
      };

      if (snapshot.trip) {
        queryClient.setQueryData<TripDto>(tripKey, {
          ...snapshot.trip,
          start_date,
          end_date,
        });
      }
      if (snapshot.trips) {
        queryClient.setQueryData<TripSummaryDto[]>(
          ["trips"],
          snapshot.trips.map((t) =>
            t.id === tripId ? { ...t, start_date, end_date } : t,
          ),
        );
      }
      if (snapshot.places) {
        const unassign = new Set(unassignPlaceIds);
        const all = [...snapshot.places.places, ...snapshot.places.saved_places].map(
          (p) =>
            unassign.has(p.id)
              ? { ...p, scheduled_date: null, order_in_day: null, scheduled_by: null }
              : p,
        );
        queryClient.setQueryData<PlacesResponse>(placesKey, {
          ...snapshot.places,
          trip: { ...snapshot.places.trip, start_date, end_date },
          places: all.filter((p) => p.scheduled_date !== null),
          saved_places: all.filter((p) => p.scheduled_date === null),
        });
      }
      return snapshot;
    },
    onError: (_e, { tripId }, ctx) => {
      if (ctx?.trip) queryClient.setQueryData(["trip", tripId], ctx.trip);
      if (ctx?.trips) queryClient.setQueryData(["trips"], ctx.trips);
      if (ctx?.places) queryClient.setQueryData(["places", tripId], ctx.places);
    },
    onSettled: (_d, _e, { tripId }) => {
      if (!hasSupabase) return;
      void queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      void queryClient.invalidateQueries({ queryKey: ["trips"] });
      void queryClient.invalidateQueries({ queryKey: ["places", tripId] });
    },
  });
}
