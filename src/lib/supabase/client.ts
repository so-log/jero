"use client";

import { createBrowserClient } from "@supabase/ssr";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/**
 * 브라우저 Supabase 클라이언트 (@supabase/ssr). 세션을 **쿠키**에 보관해 서버/미들웨어가 읽는다
 * (토큰 localStorage 저장 안 함, §8.4). `hasSupabase` 확인 후 호출한다.
 */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
