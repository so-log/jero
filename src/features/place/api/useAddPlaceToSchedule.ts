"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deriveDays, type PlacesResponse } from "@/features/itinerary";
import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/env";

import { usePlacesStore } from "../store/placesStore";

/**
 * 저장 ↔ 일정 배정 seam(04 §13, 06 "일정에 추가"). 계약 B5.
 * 배정: place.scheduled_date + order_in_day(그 날 말미) + scheduled_by 갱신 → 저장 목록에서 04 일정으로 이동.
 * 해제: scheduled_date=null → 저장 목록 복귀. 무효화 ['places', tripId], 낙관적 갱신, editor+ RLS(§8.2).
 * env 가드: 키 없으면 기존 로컬 스텁(placesStore) 유지. 컴포넌트 직접 fetch 금지(§7.1).
 */
interface SchedulePatch {
  scheduled_date: string | null;
  order_in_day: number | null;
}

/** 낙관적: 대상 place 에 patch 적용 후 일정/저장 재분할(cache 형태 유지). */
function applyPatch(
  data: PlacesResponse,
  placeId: string,
  patch: SchedulePatch,
): PlacesResponse {
  const all = [...data.places, ...data.saved_places].map((p) =>
    p.id === placeId ? { ...p, ...patch } : p,
  );
  return {
    ...data,
    places: all.filter((p) => p.scheduled_date !== null),
    saved_places: all.filter((p) => p.scheduled_date === null),
  };
}

export function useAddPlaceToSchedule(tripId: string) {
  const queryClient = useQueryClient();
  const key = ["places", tripId];
  const assignLocal = usePlacesStore((s) => s.assignLocal);
  const unassignLocal = usePlacesStore((s) => s.unassignLocal);

  const mutate = useMutation<
    void,
    Error,
    { placeId: string } & SchedulePatch,
    { previous?: PlacesResponse }
  >({
    mutationFn: async ({ placeId, scheduled_date, order_in_day }) => {
      if (!hasSupabase) return;
      const supabase = createClient();
      // 배정 시 scheduled_by=본인, 해제 시 null.
      let scheduled_by: string | null = null;
      if (scheduled_date !== null) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        scheduled_by = user?.id ?? null;
      }
      const { error } = await supabase
        .from("place")
        .update({ scheduled_date, order_in_day, scheduled_by })
        .eq("id", placeId);
      if (error) throw new Error("일정 배정에 실패했어요.");
    },
    onMutate: async ({ placeId, scheduled_date, order_in_day }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PlacesResponse>(key);
      if (previous) {
        queryClient.setQueryData(
          key,
          applyPatch(previous, placeId, { scheduled_date, order_in_day }),
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

  return {
    /** day: 1-based Day 번호. 그 날 말미 순서로 배정. */
    assign: (placeId: string, day: number) => {
      if (!hasSupabase) {
        assignLocal(placeId, day);
        return;
      }
      const data = queryClient.getQueryData<PlacesResponse>(key);
      if (!data) return;
      const date = deriveDays(data.trip.start_date, data.trip.end_date)[day - 1]
        ?.date;
      if (!date) return;
      const maxOrder = data.places
        .filter((p) => p.scheduled_date === date)
        .reduce((m, p) => Math.max(m, p.order_in_day ?? 0), 0);
      mutate.mutate({ placeId, scheduled_date: date, order_in_day: maxOrder + 1 });
    },
    unassign: (placeId: string) => {
      if (!hasSupabase) {
        unassignLocal(placeId);
        return;
      }
      mutate.mutate({ placeId, scheduled_date: null, order_in_day: null });
    },
  };
}
