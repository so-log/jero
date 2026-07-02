"use client";

import { useMutation } from "@tanstack/react-query";

import type { AuthForm } from "../lib/authSchema";

/**
 * 인증 seam(01) — 구글/이메일 로그인·회원가입. 현재 **스텁**(성공 resolve). 컴포넌트 직접 fetch 금지(§7.1).
 *
 * TODO(supabase auth):
 *   - login/signup: supabase.auth.signInWithPassword / signUp. google: signInWithOAuth({provider:'google'}).
 *   - 세션은 **서버 발급 인증 쿠키**: HttpOnly + Secure + SameSite. **토큰을 localStorage 에 보관 금지**(§8.4).
 *   - 보호 라우트(/trips·/settings 등)는 **서버에서 세션 검증**, 미인증 → `/` 리다이렉트(미들웨어, §8.2).
 *   - 인증 실패는 **일반화 메시지**(계정 존재 여부 비노출, §8.5). 시도 rate limit(§8.7). 입력 저장·로깅 금지(§8.5).
 */
export function useAuth() {
  const login = useMutation<void, Error, AuthForm>({
    mutationFn: () => Promise.resolve(),
  });
  const signup = useMutation<void, Error, AuthForm>({
    mutationFn: () => Promise.resolve(),
  });
  const googleLogin = useMutation<void, Error, void>({
    mutationFn: () => Promise.resolve(),
  });
  return { login, signup, googleLogin };
}
