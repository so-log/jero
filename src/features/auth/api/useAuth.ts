"use client";

import { useMutation } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/env";

import type { AuthForm } from "../lib/authSchema";

/**
 * 인증 seam(01) — 이메일/비번 로그인·회원가입 + 구글 OAuth. 계약 B3·B5.
 * **env 가드**: `hasSupabase=false`(키 없음)면 스텁(성공 resolve)으로 동작해 키 투입 전에도 데모/CI 유지.
 * 컴포넌트 직접 fetch 금지(§7.1). 에러는 일반화 메시지(계정 존재 여부 비노출, §8.5).
 */
export interface AuthResult {
  /** 세션이 없어 이메일 확인이 필요한 경우(가입 시 confirm 활성). */
  needsEmailConfirm: boolean;
}

export function useAuth() {
  const login = useMutation<AuthResult, Error, AuthForm>({
    mutationFn: async ({ email, pw }) => {
      if (!hasSupabase) return { needsEmailConfirm: false };
      const { error } = await createClient().auth.signInWithPassword({
        email,
        password: pw,
      });
      if (error) throw new Error("이메일 또는 비밀번호를 다시 확인해 주세요.");
      return { needsEmailConfirm: false };
    },
  });

  const signup = useMutation<AuthResult, Error, AuthForm>({
    mutationFn: async ({ email, pw, name }) => {
      if (!hasSupabase) return { needsEmailConfirm: false };
      const { data, error } = await createClient().auth.signUp({
        email,
        password: pw,
        options: {
          data: { name },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw new Error("가입에 실패했어요. 잠시 후 다시 시도해 주세요.");
      // 세션이 없으면(이메일 confirm 활성) 인증 대기 상태.
      return { needsEmailConfirm: !data.session };
    },
  });

  const googleLogin = useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!hasSupabase) return;
      const { error } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw new Error("Google 로그인을 시작하지 못했어요.");
      // 성공 시 브라우저가 Google 로 리다이렉트된다(콜백에서 세션 수립).
    },
  });

  return { login, signup, googleLogin };
}
