"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/env";

import { reorderDayPlaces } from "../lib/selectors";
import type { PlacesResponse } from "../types";

/** 드래그 재정렬 입력 — 대상 날짜 + 그 날의 새 순서(place id 배열). */
export interface ReorderInput {
  /** 'YYYY-MM-DD' — 재정렬 대상 날짜. */
  date: string;
  /** 새 순서의 일정 장소 id(해당 날 전체). */
  orderedIds: string[];
}

/**
 * 드래그 순서 → `order_in_day` 갱신 seam(04 플랜, 설계 §9·§10 "낙관적"). 현재 **스텁**.
 * onMutate 로 ['places', tripId] 캐시를 낙관적으로 재배치 → 리스트·지도 동선/번호 마커가 즉시 갱신된다
 * (04·05·06 단일 소스라 같은 키를 공유). 실패 시 스냅샷으로 롤백.
 *
 * TODO(supabase): mutationFn 을 order_in_day 일괄 update(RLS·편집 권한 §8.2)로 교체하고,
 *   onSettled 에서 invalidate(['places', tripId]) 로 서버와 재동기화한다(§10 낙관적↔실시간 reconciliation).
 *   백엔드 전인 지금은 스텁이라 성공 후 invalidate 하지 않는다 — refetch 하면 fixture 원순서로 되감기므로
 *   낙관적 캐시를 그대로 두어 데모에서 순서가 즉시·지속 반영되게 한다.
 */
export function useReorderPlaces(tripId: string) {
  const queryClient = useQueryClient();
  const key = ["places", tripId];
  return useMutation<
    ReorderInput,
    Error,
    ReorderInput,
    { previous?: PlacesResponse }
  >({
    mutationFn: async (input) => {
      if (!hasSupabase) return input; // 스텁: 낙관적 캐시만(키 없을 때)
      const { error } = await createClient().rpc("reorder_places", {
        p_trip_id: tripId,
        p_date: input.date,
        p_ids: input.orderedIds,
      });
      if (error) throw new Error("순서를 저장하지 못했어요.");
      return input;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PlacesResponse>(key);
      if (previous) {
        queryClient.setQueryData<PlacesResponse>(
          key,
          reorderDayPlaces(previous, input.date, input.orderedIds),
        );
      }
      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      // 실연동: 서버와 재동기화(§10). 스텁(키 없음)은 fixture 되감기 방지 위해 invalidate 안 함.
      if (hasSupabase) void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
