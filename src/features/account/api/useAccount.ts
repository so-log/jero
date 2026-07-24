"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/env";

import {
  avatarStoragePath,
  validateAvatarFile,
  withCacheBust,
} from "../lib/avatar";
import type { ProfileForm } from "../lib/profileSchema";
import type { ProfileDto } from "../types";

/** 아바타 스토리지 버킷(공개). 사용자가 콘솔에서 생성(본인 경로 쓰기 RLS). */
const AVATAR_BUCKET = "avatars";

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
  avatar_url: string | null;
  default_currency: ProfileDto["currency"];
  notif_trip: boolean;
  notif_comment: boolean;
  notif_settle: boolean;
  notif_marketing: boolean;
}

const PROFILE_COLS =
  "name, email, avatar_color, avatar_url, default_currency, notif_trip, notif_comment, notif_settle, notif_marketing";

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
        avatarUrl: row.avatar_url,
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
 * 아바타 이미지 업로드(감사 후속) — 검증(타입·크기) → avatars 버킷 `{userId}/avatar.<ext>` upsert →
 * publicUrl 을 profile.avatar_url 에 저장. 본인 경로만(스토리지·profile RLS 이중화, §8.3). 컴포넌트 직접 fetch 금지(§7.1).
 * env 가드: 키 없으면(데모/CI) 저장 없이 no-op 반환. 성공 시 ['profile']·['members']·['trips'] 무효화(모든 렌더 지점 갱신).
 */
export function useUploadAvatar() {
  const queryClient = useQueryClient();
  return useMutation<string | null, Error, File>({
    mutationFn: async (file) => {
      const invalid = validateAvatarFile(file);
      if (invalid) throw new Error(invalid);
      if (!hasSupabase) return null;
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요해요.");
      const path = avatarStoragePath(user.id, file.type);
      const uploaded = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
      if (uploaded.error) throw new Error("사진을 올리지 못했어요. 다시 시도해 주세요.");
      const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      // 같은 경로 upsert → 브라우저 캐시 무효화 쿼리 부여.
      const url = withCacheBust(pub.publicUrl, Date.now());
      const { error } = await supabase
        .from("profile")
        .update({ avatar_url: url })
        .eq("id", user.id);
      if (error) throw new Error("프로필에 반영하지 못했어요.");
      return url;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      void queryClient.invalidateQueries({ queryKey: ["members"] });
      void queryClient.invalidateQueries({ queryKey: ["trips"] });
    },
  });
}

/** 아바타 삭제 — 스토리지 파일(확장자 후보 전부) 제거 + avatar_url null → 이니셜 폴백. */
export function useDeleteAvatar() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!hasSupabase) return;
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요해요.");
      // 업로드 시 확장자가 파일 타입에 따라 달라지므로 후보를 모두 제거(경로는 본인 폴더 고정).
      await supabase.storage
        .from(AVATAR_BUCKET)
        .remove(["jpg", "png", "webp", "gif"].map((e) => `${user.id}/avatar.${e}`));
      const { error } = await supabase
        .from("profile")
        .update({ avatar_url: null })
        .eq("id", user.id);
      if (error) throw new Error("사진을 삭제하지 못했어요.");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      void queryClient.invalidateQueries({ queryKey: ["members"] });
      void queryClient.invalidateQueries({ queryKey: ["trips"] });
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
