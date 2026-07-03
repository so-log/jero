import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/**
 * 서버(RSC·라우트 핸들러·서버 액션)용 Supabase 클라이언트. 세션은 HttpOnly 쿠키로 유지(§8.4).
 * 보호 라우트의 세션 검증은 `auth.getUser()` 로 서버에서 수행한다(§8.2). `hasSupabase` 확인 후 호출.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // RSC 렌더 중 쿠키 set 은 무시된다 — 세션 갱신은 미들웨어가 담당.
        }
      },
    },
  });
}
