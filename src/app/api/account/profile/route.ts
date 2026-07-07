import { NextResponse } from "next/server";

import { profileSchema } from "@/features/account/lib/profileSchema";
import { hasSupabase } from "@/lib/supabase/env";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * PATCH /api/account/profile — 본인 프로필·환경설정 저장(계약 B5).
 * 신뢰 경계는 서버(§8.3): ① 세션 검증(auth.getUser) ② 동일 `profileSchema` 로 입력 **재검증**
 * ③ profile update(RLS profile_update_self 로 본인 행만). 컴포넌트는 훅→이 라우트 경유(§7.1).
 */
export async function PATCH(request: Request) {
  if (!hasSupabase) {
    return NextResponse.json({ error: "supabase_disabled" }, { status: 503 });
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 422 });
  }
  const f = parsed.data;

  const { error } = await supabase
    .from("profile")
    .update({
      name: f.name,
      avatar_color: f.avatarColor,
      default_currency: f.currency,
      notif_trip: f.notif.trip,
      notif_comment: f.notif.comment,
      notif_settle: f.notif.settle,
      notif_marketing: f.notif.marketing,
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
