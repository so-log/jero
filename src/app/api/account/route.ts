import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabase } from "@/lib/supabase/env";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * DELETE /api/account — 계정 삭제(파괴적, 계약 B5·B8 §계정삭제 소유권 승계).
 * ① 세션 재확인(§8.7) ② 내가 **유일 owner** 인 trip 은 다른 멤버(editor 우선→오래된 순)에게 owner 승계,
 *    멤버가 나뿐이면 trip+하위 cascade 삭제 ③ 생존 trip 에 남은 내 참조(created_by·payer_id 등 NOT NULL FK)를
 *    승계자에게 재배정하고 place.saved_by/scheduled_by 는 NULL 처리(고아 방지) ④ `auth.admin.deleteUser`(service role).
 * ②~④는 RLS 를 우회해야 하므로 service role(admin) 로 수행 — 서버 전용.
 */

interface MemberRow {
  user_id: string;
  role: "owner" | "editor" | "viewer";
  joined_at: string;
}

/** editor 우선 → joined_at 오래된 순으로 승계 후보 정렬. */
function pickSuccessor(others: MemberRow[]): string | null {
  if (others.length === 0) return null;
  const sorted = [...others].sort((a, b) => {
    const ra = a.role === "editor" ? 0 : 1;
    const rb = b.role === "editor" ? 0 : 1;
    if (ra !== rb) return ra - rb;
    return a.joined_at.localeCompare(b.joined_at);
  });
  return sorted[0].user_id;
}

export async function DELETE() {
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
  const uid = user.id;
  const admin = createAdminClient();

  // 내가 속한 모든 trip 을 순회하며 승계/재배정.
  const { data: myMemberships, error: mErr } = await admin
    .from("trip_member")
    .select("trip_id")
    .eq("user_id", uid);
  if (mErr) {
    return NextResponse.json({ error: "cleanup_failed" }, { status: 500 });
  }

  for (const { trip_id } of myMemberships ?? []) {
    const { data: members } = await admin
      .from("trip_member")
      .select("user_id, role, joined_at")
      .eq("trip_id", trip_id)
      .returns<MemberRow[]>();
    const all = members ?? [];
    const owners = all.filter((m) => m.role === "owner");
    const iAmSoleOwner =
      owners.length === 1 && owners[0].user_id === uid;
    const others = all.filter((m) => m.user_id !== uid);
    const successor = pickSuccessor(others);

    if (iAmSoleOwner && successor === null) {
      // 나 혼자인 소유 trip → trip + 하위 데이터 cascade 삭제.
      await admin.from("trip").delete().eq("id", trip_id);
      continue;
    }

    if (iAmSoleOwner && successor) {
      // 승계: 다른 멤버를 owner 로 승격.
      await admin
        .from("trip_member")
        .update({ role: "owner" })
        .eq("trip_id", trip_id)
        .eq("user_id", successor);
    }

    // 생존 trip: 내 참조를 승계자에게 재배정(NOT NULL FK 는 재배정, nullable 은 NULL).
    if (successor) {
      await admin
        .from("trip")
        .update({ created_by: successor })
        .eq("id", trip_id)
        .eq("created_by", uid);
      await admin
        .from("place")
        .update({ saved_by: null })
        .eq("trip_id", trip_id)
        .eq("saved_by", uid);
      await admin
        .from("place")
        .update({ scheduled_by: null })
        .eq("trip_id", trip_id)
        .eq("scheduled_by", uid);
      await admin
        .from("expense")
        .update({ payer_id: successor })
        .eq("trip_id", trip_id)
        .eq("payer_id", uid);
      await admin
        .from("expense")
        .update({ created_by: successor })
        .eq("trip_id", trip_id)
        .eq("created_by", uid);
      await admin
        .from("share_link")
        .update({ created_by: successor })
        .eq("trip_id", trip_id)
        .eq("created_by", uid);
      await admin
        .from("invitation")
        .update({ invited_by: successor })
        .eq("trip_id", trip_id)
        .eq("invited_by", uid);
    }
  }

  // 계정 삭제 — profile(→ 남은 trip_member·expense_split ON DELETE CASCADE) 정리 후 auth 사용자 제거.
  const { error: delErr } = await admin.auth.admin.deleteUser(uid);
  if (delErr) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
