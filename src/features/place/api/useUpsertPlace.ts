"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { PlacesResponse } from "@/features/itinerary";
import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/env";

import type { PlaceForm } from "../lib/placeSchema";

/** scheduledDate 지정 시(플랜 Day 맥락 추가, B6) 그 날짜에 배정하며 생성. 없으면 미배정 저장. */
type PlaceUpsert = PlaceForm & { id?: string; scheduledDate?: string | null };

/**
 * 장소 추가·편집·삭제 seam(오버레이 ①, 04 "장소 추가"). 계약 B5.
 * env 가드로 키 없으면 스텁. 무효화 키 ['places', tripId] 유지 → 04·05·06 동기화(설계 §5).
 * 서버 RLS(editor+)가 편집 권한을 강제(§8.2). 입력은 서버에서 재검증 대상(§8.3).
 */
export function useUpsertPlace(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation<PlaceUpsert, Error, PlaceUpsert>({
    mutationFn: async (input) => {
      if (!hasSupabase) return input;
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const row = {
        name: input.name,
        area: input.address || null,
        category: input.category,
        folder_id: input.folderId,
        memo: input.memo || null,
        // 좌표·place_id 기록(Places Autocomplete/지도 클릭). 없으면 null — 지도 마커만 미표시.
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        google_place_id: input.googlePlaceId ?? null,
      };
      if (input.id) {
        const { error } = await supabase
          .from("place")
          .update(row)
          .eq("id", input.id);
        if (error) throw new Error("장소를 저장하지 못했어요.");
      } else {
        // 플랜 Day 맥락 추가(B6): scheduledDate 있으면 그 날짜 말미에 배정하며 생성. 없으면 미배정 저장.
        let scheduled_date: string | null = null;
        let order_in_day: number | null = null;
        let scheduled_by: string | null = null;
        if (input.scheduledDate) {
          scheduled_date = input.scheduledDate;
          scheduled_by = user?.id ?? null;
          const cache = queryClient.getQueryData<PlacesResponse>([
            "places",
            tripId,
          ]);
          const maxOrder = (cache?.places ?? [])
            .filter((p) => p.scheduled_date === scheduled_date)
            .reduce((m, p) => Math.max(m, p.order_in_day ?? 0), 0);
          order_in_day = maxOrder + 1;
        }
        const { error } = await supabase.from("place").insert({
          ...row,
          trip_id: tripId,
          saved_by: user?.id ?? null,
          scheduled_date,
          order_in_day,
          scheduled_by,
        });
        if (error) throw new Error("장소를 추가하지 못했어요.");
      }
      return input;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["places", tripId] });
    },
  });
}

/** 장소 삭제(ConfirmDialog 확인 후). 서버에서 권한 재확인(§8.2). */
export function useDeletePlace(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (placeId) => {
      if (!hasSupabase) return;
      const { error } = await createClient()
        .from("place")
        .delete()
        .eq("id", placeId);
      if (error) throw new Error("장소를 삭제하지 못했어요.");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["places", tripId] });
    },
  });
}

/**
 * 장소 메모 인라인 자동저장 seam(2차 F) — **memo 만 patch**. MemoField 가 debounce 후 호출.
 * 낙관적 setQueryData(['places', tripId]) 로 즉시 반영, 실패 시 롤백, settle 후 재동기화(무효화 유지).
 * editor+ 권한은 서버 RLS(place_write)가 강제(§8.2). env 가드: 키 없으면 낙관 캐시만.
 */
export function useAutosaveMemo(tripId: string) {
  const queryClient = useQueryClient();
  const key = ["places", tripId];
  return useMutation<
    void,
    Error,
    { placeId: string; memo: string },
    { previous?: PlacesResponse }
  >({
    mutationFn: async ({ placeId, memo }) => {
      if (!hasSupabase) return;
      const { error } = await createClient()
        .from("place")
        .update({ memo: memo || null })
        .eq("id", placeId);
      if (error) throw new Error("메모를 저장하지 못했어요.");
    },
    onMutate: async ({ placeId, memo }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PlacesResponse>(key);
      if (previous) {
        const patch = (p: (typeof previous.places)[number]) =>
          p.id === placeId ? { ...p, memo: memo || null } : p;
        queryClient.setQueryData<PlacesResponse>(key, {
          ...previous,
          places: previous.places.map(patch),
          saved_places: previous.saved_places.map(patch),
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
