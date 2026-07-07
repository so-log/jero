"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { InviteRole } from "@/features/trip";
import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/env";

/**
 * 멤버·공유 관리 seam(오버레이 ②). owner 만 관리 — 서버 RLS(trip_role='owner')가 강제(§8.2).
 * 무효화 키 ['members', tripId] 유지. env 가드로 키 없으면 스텁. token 은 고엔트로피 UUID.
 */
const DAY = 86_400_000;
function newToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

export function useShareActions(tripId: string) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["members", tripId] });

  const invite = useMutation<void, Error, { email: string; role: InviteRole }>({
    mutationFn: async ({ email, role }) => {
      if (!hasSupabase) return;
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("invitation").insert({
        trip_id: tripId,
        email,
        role,
        token: newToken(),
        invited_by: user?.id ?? null,
        expires_at: new Date(Date.now() + 30 * DAY).toISOString(),
      });
      if (error) throw new Error("초대에 실패했어요.");
    },
    onSuccess: () => void invalidate(),
  });

  const changeRole = useMutation<void, Error, { memberId: string; role: InviteRole }>({
    mutationFn: async ({ memberId, role }) => {
      if (!hasSupabase) return;
      const { error } = await createClient()
        .from("trip_member")
        .update({ role })
        .eq("trip_id", tripId)
        .eq("user_id", memberId);
      if (error) throw new Error("역할 변경에 실패했어요.");
    },
    onSuccess: () => void invalidate(),
  });

  const removeMember = useMutation<void, Error, string>({
    mutationFn: async (memberId) => {
      if (!hasSupabase) return;
      const { error } = await createClient()
        .from("trip_member")
        .delete()
        .eq("trip_id", tripId)
        .eq("user_id", memberId);
      if (error) throw new Error("멤버 제거에 실패했어요.");
    },
    onSuccess: () => void invalidate(),
  });

  /** 공유 링크 발급 → token 반환(`/share/{token}`). owner. */
  const issueShareLink = useMutation<string, Error, { role: InviteRole }>({
    mutationFn: async ({ role }) => {
      if (!hasSupabase) return "demo";
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const token = newToken();
      const { error } = await supabase.from("share_link").insert({
        trip_id: tripId,
        token,
        role,
        created_by: user?.id ?? null,
        expires_at: new Date(Date.now() + 30 * DAY).toISOString(),
      });
      if (error) throw new Error("공유 링크 발급에 실패했어요.");
      return token;
    },
  });

  /** 공유 링크 폐기(revoked). owner. */
  const revokeShareLink = useMutation<void, Error, string>({
    mutationFn: async (linkId) => {
      if (!hasSupabase) return;
      const { error } = await createClient()
        .from("share_link")
        .update({ revoked: true })
        .eq("id", linkId);
      if (error) throw new Error("링크 폐기에 실패했어요.");
    },
  });

  return { invite, changeRole, removeMember, issueShareLink, revokeShareLink };
}
