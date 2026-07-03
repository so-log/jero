/**
 * Supabase 환경 (계약 B7). 클라 노출 값만 여기서 읽는다.
 * 키가 없으면 `hasSupabase=false` → 인증 seam 이 기존 스텁을 유지하고 미들웨어 보호도 스킵한다
 * (키 투입 전에도 `yarn run check`/`build`·데모가 깨지지 않게). SERVICE_ROLE 키는 서버 전용이라 여기서 다루지 않는다.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const hasSupabase =
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
