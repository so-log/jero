"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/env";

import type { PlaceForm } from "../lib/placeSchema";

type PlaceUpsert = PlaceForm & { id?: string };

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
      };
      if (input.id) {
        const { error } = await supabase
          .from("place")
          .update(row)
          .eq("id", input.id);
        if (error) throw new Error("장소를 저장하지 못했어요.");
      } else {
        const { error } = await supabase
          .from("place")
          .insert({ ...row, trip_id: tripId, saved_by: user?.id ?? null });
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
