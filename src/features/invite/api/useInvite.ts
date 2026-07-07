"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { InviteRole } from "@/features/trip";
import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/env";

/**
 * 초대 수락 seam(12, /invite/[token]) — 계약 B2.1. preview_invite(익명 미리보기) + accept_invite(수락).
 * MVP bearer 토큰(링크 소지자 수락). 컴포넌트 직접 fetch 금지(§7.1). env 가드로 키 없으면 스텁.
 */
export type InvitePreview =
  | {
      ok: true;
      trip_title: string;
      start_date: string;
      end_date: string;
      role: InviteRole;
      inviter_name: string;
    }
  | { ok: false; reason: "expired" | "invalid" };

export function usePreviewInvite(token: string) {
  return useQuery<InvitePreview>({
    queryKey: ["invite", token],
    retry: false,
    queryFn: async () => {
      if (!hasSupabase) {
        return {
          ok: true,
          trip_title: "데모 여행",
          start_date: "2026-04-18",
          end_date: "2026-04-21",
          role: "editor",
          inviter_name: "데모",
        };
      }
      const { data, error } = await createClient().rpc("preview_invite", {
        p_token: token,
      });
      if (error || !data || typeof data !== "object" || !("ok" in data)) {
        return { ok: false, reason: "invalid" };
      }
      return data as InvitePreview;
    },
  });
}

/** 수락 → accept_invite RPC → 멤버 전환. 성공 시 trip_id 반환. */
export function useAcceptInvite() {
  const queryClient = useQueryClient();
  return useMutation<string, Error, string>({
    mutationFn: async (token) => {
      if (!hasSupabase) return "trip_1";
      const { data, error } = await createClient().rpc("accept_invite", {
        invite_token: token,
      });
      if (error || typeof data !== "string") {
        throw new Error("초대를 수락하지 못했어요. 링크가 만료됐을 수 있어요.");
      }
      return data;
    },
    onSuccess: (tripId) => {
      void queryClient.invalidateQueries({ queryKey: ["trips"] });
      void queryClient.invalidateQueries({ queryKey: ["members", tripId] });
    },
  });
}
