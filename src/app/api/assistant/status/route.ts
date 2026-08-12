import { NextResponse } from "next/server";

import { isAssistantEnabled } from "@/lib/ai/env";
import { hasSupabase } from "@/lib/supabase/env";

/**
 * GET /api/assistant/status — 어시스턴트 사용 가능 여부만 알려준다(설계 §6.1).
 *
 * ★ **boolean 만** 내려보낸다. 어떤 키가 있는지·모델이 무엇인지는 노출하지 않는다.
 * 클라는 이 값으로 FAB 노출을 결정한다(키 없으면 FAB 자체가 렌더되지 않는다 → 회귀 0).
 */
export async function GET() {
  return NextResponse.json({ enabled: hasSupabase && isAssistantEnabled() });
}
