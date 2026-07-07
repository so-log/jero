import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_URL } from "./env";

/**
 * **서버 전용** Supabase 관리 클라이언트(service role). RLS 를 우회하므로 라우트 핸들러/서버 액션에서만
 * import 한다(계정 삭제의 소유권 승계·`auth.admin.deleteUser` 등, 계약 B7).
 * 키(`SUPABASE_SERVICE_ROLE_KEY`)는 `NEXT_PUBLIC_` 접두 없이 서버 환경변수로만 주입(§8.1) — 클라 번들에 유입 금지.
 * 브라우저에서 실수로 실행되면 즉시 throw(런타임 가드).
 */
export function createAdminClient(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient 는 서버에서만 호출할 수 있습니다.");
  }
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createClient(SUPABASE_URL, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
