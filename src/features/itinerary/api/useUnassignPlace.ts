"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/env";

import type { PlacesResponse } from "../types";

/**
 * 일정에서 빼기(04 일정 카드) — scheduled_date=null 로 저장 목록 복귀 + 그 날 남은 순서 컴팩션(1..n).
 * add-to-schedule 은 place 도메인(useAddPlaceToSchedule), remove-from-schedule 은 일정 도메인 소유.
 * 낙관적 갱신 후 invalidate(['places', tripId]) 로 04·05·06 동기화. editor+ RLS 강제(§8.2).
 * env 가드: 키 없으면 no-op. 컴포넌트 직접 fetch 금지(§7.1) — 훅 경유.
 */
export function useUnassignPlace(tripId: string) {
  const queryClient = useQueryClient();
  const key = ["places", tripId];

  return useMutation<void, Error, string, { previous?: PlacesResponse }>({
    mutationFn: async (placeId) => {
      if (!hasSupabase) return;
      const { error } = await createClient()
        .from("place")
        .update({ scheduled_date: null, order_in_day: null, scheduled_by: null })
        .eq("id", placeId);
      if (error) throw new Error("일정에서 빼지 못했어요.");
    },
    onMutate: async (placeId) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PlacesResponse>(key);
      if (previous) {
        const merged = [...previous.places, ...previous.saved_places];
        const target = merged.find((p) => p.id === placeId);
        const date = target?.scheduled_date ?? null;
        // 원본 불변 유지 위해 얕은 복사 후 편집.
        const all = merged.map((p) => ({ ...p }));
        const removed = all.find((p) => p.id === placeId);
        if (removed) {
          removed.scheduled_date = null;
          removed.order_in_day = null;
          removed.scheduled_by = null;
        }
        // 그 날 남은 장소 순서 컴팩션(표시 흔들림 방지).
        if (date) {
          all
            .filter((p) => p.scheduled_date === date)
            .sort((a, b) => (a.order_in_day ?? 0) - (b.order_in_day ?? 0))
            .forEach((p, i) => {
              p.order_in_day = i + 1;
            });
        }
        queryClient.setQueryData<PlacesResponse>(key, {
          ...previous,
          places: all.filter((p) => p.scheduled_date !== null),
          saved_places: all.filter((p) => p.scheduled_date === null),
        });
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
