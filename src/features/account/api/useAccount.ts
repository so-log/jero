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

export function useProfileQuery() {
  return useQuery<ProfileDto>({
    queryKey: ["profile"],
    queryFn: () => PROFILE_FIXTURE,
  });
}

/**
 * 프로필·환경설정 저장. TODO(supabase): profile/user_preference update → invalidate(['profile']).
 * 입력은 서버에서 재검증(§8.3). 아바타 이미지 업로드는 스토리지·서명 URL(§8.3, 09 §13).
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation<ProfileForm, Error, ProfileForm>({
    mutationFn: (input) => Promise.resolve(input),
    onSuccess: (data) => {
      queryClient.setQueryData<ProfileDto>(["profile"], (prev) =>
        prev ? { ...prev, ...data } : prev,
      );
    },
  });
}

/**
 * 계정 삭제 — 파괴적·되돌릴 수 없음. ConfirmDialog 확인 후 호출.
 * TODO(supabase): 서버에서 **본인 인증·소유 재확인**(§8.7) + cascade(owner 공유 여행 처리, §13) 후 세션 종료.
 */
export function useDeleteAccount() {
  return useMutation<void, Error, void>({
    mutationFn: () => Promise.resolve(),
  });
}

/** 로그아웃 — Supabase 세션 종료(쿠키 정리). env 가드: 키 없으면 no-op(호출부에서 router.push('/')). */
export function useLogout() {
  return async () => {
    if (hasSupabase) await createClient().auth.signOut();
  };
}
