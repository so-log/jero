import { NextResponse, type NextRequest } from "next/server";

import { hasSupabase } from "@/lib/supabase/env";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * 인증 콜백(계약 B3) — OAuth·이메일 확인·복구 링크의 `code` 를 세션으로 교환한 뒤 목적지로 리다이렉트.
 * 비 UI 라우트. env 가드: 키 없으면 교환 없이 리다이렉트만.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const returnTo = searchParams.get("returnTo");
  const dest = returnTo && returnTo.startsWith("/") ? returnTo : "/trips";

  if (hasSupabase && code) {
    const supabase = await createServerSupabase();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}${dest}`);
}
