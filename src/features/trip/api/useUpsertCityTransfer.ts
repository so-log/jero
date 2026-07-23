"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/env";

import type { CityArrival, TripCity } from "../lib/citySchedule";

/** 이동 편집 입력 — 도착 도시(cityId)에 arrival_* 를 쓴다. 필드 비우면 null(이동 삭제). */
export interface CityTransferInput {
  cityId: string;
  arrival: CityArrival | null;
}

/**
 * 도시 간 이동(도착 이동) 저장 seam(다중 도시 Phase 5, 설계 §11.2) — trip_city.arrival_* update.
 * editor+ 권한은 서버 RLS(city_write)가 강제(§8.2). 낙관적 setQueryData(['cities', tripId]) → 즉시 반영, 실패 롤백.
 * env 가드로 키 없으면 낙관 캐시만. 컴포넌트 직접 fetch 금지(§7.1) — 이 훅 경유.
 */
export function useUpsertCityTransfer(tripId: string) {
  const queryClient = useQueryClient();
  const key = ["cities", tripId];
  return useMutation<void, Error, CityTransferInput, { previous?: TripCity[] }>({
    mutationFn: async ({ cityId, arrival }) => {
      if (!hasSupabase) return;
      const { error } = await createClient()
        .from("trip_city")
        .update({
          arrival_mode: arrival?.mode ?? null,
          arrival_name: arrival?.name ?? null,
          arrival_time: arrival?.time ?? null,
          arrival_duration_min: arrival?.durationMin ?? null,
        })
        .eq("id", cityId);
      if (error) throw new Error("이동 정보를 저장하지 못했어요.");
    },
    onMutate: async ({ cityId, arrival }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<TripCity[]>(key);
      if (previous) {
        queryClient.setQueryData<TripCity[]>(
          key,
          previous.map((c) => (c.id === cityId ? { ...c, arrival } : c)),
        );
      }
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
    onSettled: () => {
      if (hasSupabase) void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
