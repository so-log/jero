import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { embedQuery, toVectorLiteral } from "./embed";

/**
 * RAG 유사 검색 (설계 §3.4). **Phase 1 에서 배선만 하고 Phase 2 챗이 소비**한다.
 *
 * `match_place_embeddings` 는 `security invoker` 라 **호출자 RLS 가 그대로 적용**된다 —
 * 반드시 **요청자 세션 클라이언트**를 넘겨야 하며, service_role 클라이언트를 넘기면 안 된다(§6.2).
 * 비멤버가 호출하면 정책상 0행이 돌아온다.
 */

const matchRowSchema = z.object({
  place_id: z.string(),
  content: z.string(),
  similarity: z.number(),
});
const matchRowsSchema = z.array(matchRowSchema);

export type SimilarPlace = z.infer<typeof matchRowSchema>;

/** 기본 K — 컨텍스트 토큰 상한(설계 §3.4)에 맞춘 값. */
const DEFAULT_LIMIT = 8;

/**
 * 질문과 의미가 가까운 이 여행의 장소를 찾는다.
 * 임베딩 실패·RPC 실패는 **빈 배열**로 흡수한다 — RAG 근거가 줄 뿐 어시스턴트는 계속 동작해야 한다(설계 §7).
 */
export async function searchSimilarPlaces(
  supabase: SupabaseClient,
  tripId: string,
  query: string,
  limit: number = DEFAULT_LIMIT,
  signal?: AbortSignal,
): Promise<SimilarPlace[]> {
  let vector: number[];
  try {
    ({ vector } = await embedQuery(query, signal));
  } catch {
    return []; // 임베딩 불가 → 구조 컨텍스트만으로 답한다(폴백).
  }

  const { data, error } = await supabase.rpc("match_place_embeddings", {
    p_trip_id: tripId,
    p_query: toVectorLiteral(vector),
    p_limit: limit,
  });
  if (error) return [];

  const parsed = matchRowsSchema.safeParse(data);
  return parsed.success ? parsed.data : [];
}
