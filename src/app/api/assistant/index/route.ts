import { NextResponse } from "next/server";
import { z } from "zod";

import { embedDocuments, toVectorLiteral } from "@/lib/ai/embed";
import { isAssistantEnabled } from "@/lib/ai/env";
import { hasSupabase } from "@/lib/supabase/env";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * POST /api/assistant/index — 이 여행의 장소를 임베딩해 `place_embedding` 에 upsert (설계 §3.3, 계약 C5).
 *
 * 신뢰 경계는 서버(§8.3):
 *  ① feature flag(키 없으면 비활성) ② 세션 검증(auth.getUser) ③ 입력 Zod 검증
 *  ④ **멤버십은 DB 가 강제** — `stale_place_embeddings`(invoker, RLS)로 비멤버는 0행,
 *     `upsert_place_embedding`(definer)은 함수 내부에서 `is_trip_member` 를 자가 인가한다(계약 C1-a).
 *
 * 비용 절감(설계 §3.3): `stale_place_embeddings` 가 **content_hash 가 다른 장소만** 돌려주므로
 * 텍스트가 실제로 바뀐 경우에만 임베딩이 발생한다. 임베딩은 배치 1회 요청.
 */

/** 한 번의 요청에서 처리할 최대 장소 수 — 비용·지연 상한(설계 §8). */
const MAX_BATCH = 50;

const bodySchema = z.object({
  tripId: z.string().uuid(),
});

const staleRowsSchema = z.array(
  z.object({ place_id: z.string(), content: z.string() }),
);

export async function POST(request: Request) {
  if (!hasSupabase) {
    return NextResponse.json({ error: "supabase_disabled" }, { status: 503 });
  }
  if (!isAssistantEnabled()) {
    return NextResponse.json({ error: "assistant_disabled" }, { status: 503 });
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 422 });
  }
  const { tripId } = parsed.data;

  // ── 재인덱싱 대상 조회(RLS invoker — 비멤버는 0행, 변경분만).
  const { data: staleData, error: staleError } = await supabase.rpc(
    "stale_place_embeddings",
    { p_trip_id: tripId, p_limit: MAX_BATCH },
  );
  if (staleError) {
    return NextResponse.json({ error: "index_failed" }, { status: 500 });
  }
  const stale = staleRowsSchema.safeParse(staleData);
  if (!stale.success) {
    return NextResponse.json({ error: "index_failed" }, { status: 500 });
  }
  // 빈 content(이름 없는 장소 등)는 임베딩 대상에서 제외 — 의미 없는 벡터를 만들지 않는다.
  const targets = stale.data.filter((row) => row.content.trim().length > 0);
  /** 상한에 꽉 찼으면 아직 남은 게 있을 수 있다 — 클라가 한 번 더 호출하면 된다. */
  const hasMore = stale.data.length === MAX_BATCH;
  if (targets.length === 0) {
    return NextResponse.json({ indexed: 0, hasMore });
  }

  // ── 배치 임베딩(요청 1회). 실패는 502 — 부분 저장 없이 다음 호출에서 다시 시도된다.
  let embeddings: Awaited<ReturnType<typeof embedDocuments>>;
  try {
    embeddings = await embedDocuments(targets.map((t) => t.content));
  } catch {
    // ★ provider 에러 원문은 키·프롬프트를 담을 수 있어 클라에 전달하지 않는다(§8.5).
    return NextResponse.json({ error: "embedding_failed" }, { status: 502 });
  }

  // ── upsert(definer RPC — trip_id·content 는 DB 가 place 행에서 파생, 클라 입력 아님).
  // 순차 실행: 최대 MAX_BATCH 회(≈수 초). 동시 실행은 커넥션 풀을 압박해 얻는 것보다 잃는 게 크다.
  let indexed = 0;
  for (const [i, target] of targets.entries()) {
    const embedding = embeddings[i];
    if (!embedding) continue;
    const { error } = await supabase.rpc("upsert_place_embedding", {
      p_place_id: target.place_id,
      p_embedding: toVectorLiteral(embedding.vector),
      p_model: embedding.model,
    });
    // 개별 실패(권한·삭제된 장소)는 건너뛴다 — 나머지는 계속 인덱싱한다.
    if (!error) indexed += 1;
  }

  return NextResponse.json({ indexed, hasMore });
}
