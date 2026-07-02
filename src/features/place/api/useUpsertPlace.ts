"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { PlaceForm } from "../lib/placeSchema";

/**
 * 장소 추가·편집·삭제 seam(오버레이 ①, 04 "장소 추가"). 현재 **스텁** — 폼·검증·낙관 UI 까지.
 * 무효화 키 ['places', tripId] 는 04·05·06 쿼리와 일치 → 닫으면 해당 뷰가 갱신된다(설계 §5).
 *
 * TODO(supabase): mutationFn 을 place insert/update/delete(RLS, 편집 권한 §8.2)로 교체.
 *   입력은 서버에서 재검증(§8.3). google_place_id·lat/lng 는 Places 연동 시 채운다(04 §13).
 */
export function useUpsertPlace(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation<PlaceForm & { id?: string }, Error, PlaceForm & { id?: string }>(
    {
      mutationFn: (input) => Promise.resolve(input),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ["places", tripId] });
      },
    },
  );
}

/** 장소 삭제(ConfirmDialog 확인 후). 파괴적 — 서버에서 권한 재확인(§8.2). */
export function useDeletePlace(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: () => Promise.resolve(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["places", tripId] });
    },
  });
}
