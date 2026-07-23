"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/env";

/**
 * 현재 인증 사용자 여부 조회 seam(§7.1 직접 fetch 금지) — 비밀번호 재설정 페이지에서
 * 복구 세션(콜백에서 수립) 유무 판정에 쓴다. 세션 있으면 새 비번 폼, 없으면 만료/무효 안내.
 * env 가드: 키 없으면(데모/CI) 인증된 것으로 간주해 폼을 노출(스텁 흐름 유지).
 */
export function useAuthUser() {
  return useQuery<{ authenticated: boolean }>({
    queryKey: ["auth-user"],
    queryFn: async () => {
      if (!hasSupabase) return { authenticated: true };
      const { data } = await createClient().auth.getUser();
      return { authenticated: !!data.user };
    },
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}
