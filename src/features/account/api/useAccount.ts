"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/env";

import type { ProfileForm } from "../lib/profileSchema";
import type { ProfileDto } from "../types";

/**
 * 계정(09) 데이터·동작 seam. 컴포넌트 직접 fetch 금지(§7.1). 모두 현재 **스텁**.
 */
const PROFILE_FIXTURE: ProfileDto = {
  name: "지현",
  email: "jihyun@trip.co",
  avatarColor: "#3B7DF0",
  currency: "KRW",
  notif: { trip: true, comment: true, settle: true, marketing: false },
};

/** 앱 메타(좌측 nav 하단). */
export const ACCOUNT_META = {
  version: "v2.4",
  lastLogin: "2026.6.23 오전 9:12",
};

/** profile 테이블(본인) select 행 — 생성 타입 부재로 계약(§4.1) 기준 수기 정의(usePlacesQuery 패턴). */
interface ProfileRow {
  name: string;
  email: string;
  avatar_color: string;
  default_currency: ProfileDto["currency"];
  notif_trip: boolean;
  notif_comment: boolean;
  notif_settle: boolean;
  notif_marketing: boolean;
}

const PROFILE_COLS =
  "name, email, avatar_color, default_currency, notif_trip, notif_comment, notif_settle, notif_marketing";

/** 본인 profile 조회(계약 B5). RLS(profile_select) 로 본인 행만. env 가드: 키 없으면 fixture. */
export function useProfileQuery() {
  return useQuery<ProfileDto>({
    queryKey: ["profile"],
    queryFn: async () => {
      if (!hasSupabase) return PROFILE_FIXTURE;
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요해요.");
      const { data, error } = await supabase
        .from("profile")
        .select(PROFILE_COLS)
        .eq("id", user.id)
        .limit(1)
        .returns<ProfileRow[]>();
      const row = data?.[0];
      if (error || !row) throw new Error("프로필을 불러오지 못했어요.");
      return {
        name: row.name,
        email: row.email,
        avatarColor: row.avatar_color,
        currency: row.default_currency,
        notif: {
          trip: row.notif_trip,
          comment: row.notif_comment,
          settle: row.notif_settle,
          marketing: row.notif_marketing,
        },
      };
    },
  });
}

/**
 * 프로필·환경설정 저장(계약 B5). **서버 라우트**(PATCH /api/account/profile)에서 세션 검증 + 동일
 * profileSchema 로 재검증 후 update(§8.3). 성공 시 ['profile'] 무효화 → 상단바·워크스페이스 아바타 갱신.
 * (아바타 이미지 업로드는 스토리지·서명 URL — 후속.)
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation<ProfileForm, Error, ProfileForm>({
    mutationFn: async (input) => {
      if (!hasSupabase) return input;
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("저장에 실패했어요. 다시 시도해 주세요.");
      return input;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

/**
 * 계정 삭제 — 파괴적·되돌릴 수 없음. ConfirmDialog 확인 후 호출.
 * **서버 라우트**(DELETE /api/account)가 세션 재확인 + 소유권 승계/재배정 + auth.admin.deleteUser(service role)
 * 수행(§8.7, B8). 성공 후 클라 세션 종료 + 캐시 초기화 → 호출부에서 `/`(01)로 이동.
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!hasSupabase) return;
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) throw new Error("계정 삭제에 실패했어요. 다시 시도해 주세요.");
      await createClient().auth.signOut();
      queryClient.clear();
    },
  });
}

/** 로그아웃 — Supabase 세션 종료(쿠키 정리). env 가드: 키 없으면 no-op(호출부에서 router.push('/')). */
export function useLogout() {
  return async () => {
    if (hasSupabase) await createClient().auth.signOut();
  };
}
