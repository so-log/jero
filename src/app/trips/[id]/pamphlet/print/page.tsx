import { redirect } from "next/navigation";

import { PamphletPrintDocument } from "@/features/pamphlet";
import {
  PAMPHLET_THEMES,
  type PamphletThemeKey,
} from "@/lib/constants/pamphletThemes";
import { hasSupabase } from "@/lib/supabase/env";
import { createServerSupabase } from "@/lib/supabase/server";
import type { PamphletSections } from "@/features/pamphlet";

/**
 * 팜플렛 인쇄 전용 라우트(2차 2단계, 팜플렛_설계 §5) — 미리보기와 동일 컴포넌트를 A4 landscape print CSS 로 렌더.
 * 쿼리: theme·sections·token. **멤버 세션 검증**(비멤버 차단, §8.2) — 미들웨어(auth) + 여기서 멤버십 재확인.
 * window.print() 로 'PDF 저장'(폴백). Next 16: params·searchParams 는 Promise.
 */
function parseTheme(v: string | string[] | undefined): PamphletThemeKey {
  const k = Array.isArray(v) ? v[0] : v;
  return k && k in PAMPHLET_THEMES ? (k as PamphletThemeKey) : "beach";
}

function parseSections(v: string | string[] | undefined): PamphletSections {
  const raw = Array.isArray(v) ? v[0] : (v ?? "cover,schedule,prep,intro,qr");
  const set = new Set(raw.split(",").map((s) => s.trim()));
  return {
    cover: set.has("cover"),
    schedule: set.has("schedule"),
    prep: set.has("prep"),
    intro: set.has("intro"),
    qr: set.has("qr"),
  };
}

export default async function PamphletPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  // 멤버십 재검증(비멤버 차단) — 키 있을 때만(없으면 스텁 데모).
  if (hasSupabase) {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect(`/?returnTo=/trips/${id}/pamphlet`);
    const { data: member } = await supabase
      .from("trip_member")
      .select("role")
      .eq("trip_id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!member) redirect("/trips");
  }

  const token = Array.isArray(sp.token) ? sp.token[0] : sp.token;
  return (
    <PamphletPrintDocument
      tripId={id}
      themeKey={parseTheme(sp.theme)}
      sections={parseSections(sp.sections)}
      token={token}
    />
  );
}
