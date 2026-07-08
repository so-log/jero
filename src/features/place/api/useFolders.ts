"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { FolderDto, PlacesResponse } from "@/features/itinerary";
import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/env";

/**
 * 폴더 관리 seam(2차 B, 06 장소) — 생성/이름변경/삭제. 계약 §4.3 · 0002 folder RLS(멤버 조회 / editor+ CRUD).
 * 무효화 키 ['places', tripId] 유지 → 사이드바·개수·필터 동기화(단일 소스). 낙관적 갱신 후 서버 재동기화.
 * 편집 권한은 서버 RLS(editor+)가 강제(§8.2). 컴포넌트 직접 fetch 금지(§7.1) — 훅 경유.
 * env 가드: 키 없으면 낙관 캐시만(스텁).
 */
const DEFAULT_FOLDER_ICON = "bookmark";
const DEFAULT_FOLDER_COLOR = "#3B7DF0";

/** id 있으면 이름변경(update), 없으면 생성(insert). */
export interface FolderUpsertInput {
  id?: string;
  name: string;
}

export function useUpsertFolder(tripId: string) {
  const queryClient = useQueryClient();
  const key = ["places", tripId];

  return useMutation<
    FolderUpsertInput,
    Error,
    FolderUpsertInput,
    { previous?: PlacesResponse }
  >({
    mutationFn: async (input) => {
      if (!hasSupabase) return input;
      const supabase = createClient();
      if (input.id) {
        const { error } = await supabase
          .from("folder")
          .update({ name: input.name })
          .eq("id", input.id);
        if (error) throw new Error("폴더 이름을 변경하지 못했어요.");
      } else {
        const { error } = await supabase.from("folder").insert({
          trip_id: tripId,
          name: input.name,
          icon: DEFAULT_FOLDER_ICON,
          color: DEFAULT_FOLDER_COLOR,
        });
        if (error) throw new Error("폴더를 추가하지 못했어요.");
      }
      return input;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PlacesResponse>(key);
      if (previous) {
        const folders: FolderDto[] = input.id
          ? previous.folders.map((f) =>
              f.id === input.id ? { ...f, name: input.name } : f,
            )
          : [
              ...previous.folders,
              {
                id: `temp-${crypto.randomUUID()}`,
                name: input.name,
                icon: DEFAULT_FOLDER_ICON,
                color: DEFAULT_FOLDER_COLOR,
              },
            ];
        queryClient.setQueryData<PlacesResponse>(key, { ...previous, folders });
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

export function useDeleteFolder(tripId: string) {
  const queryClient = useQueryClient();
  const key = ["places", tripId];

  return useMutation<void, Error, string, { previous?: PlacesResponse }>({
    mutationFn: async (folderId) => {
      if (!hasSupabase) return;
      // place.folder_id 는 ON DELETE SET NULL → 소속 장소는 서버에서 자동 미분류(0002).
      const { error } = await createClient()
        .from("folder")
        .delete()
        .eq("id", folderId);
      if (error) throw new Error("폴더를 삭제하지 못했어요.");
    },
    onMutate: async (folderId) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PlacesResponse>(key);
      if (previous) {
        queryClient.setQueryData<PlacesResponse>(key, {
          ...previous,
          folders: previous.folders.filter((f) => f.id !== folderId),
          // 소속 저장 장소는 미분류(folder_id=null)로 — 서버 SET NULL 을 낙관적으로 반영.
          saved_places: previous.saved_places.map((p) =>
            p.folder_id === folderId ? { ...p, folder_id: null } : p,
          ),
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
