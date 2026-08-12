import { tool } from "ai";
import { z } from "zod";

import { MAX_RESULTS, type PlaceCandidate, searchPlaces } from "../places";

/**
 * `searchPlaces` 도구 (설계 §5.1) — **읽기 전용**. 모델에 쓰기 도구는 주지 않는다.
 *
 * 모델은 "무엇을 찾을지"만 정하고, 실존 여부·좌표는 Google Places 가 판정한다.
 * 도구가 빈 결과를 주면 모델은 "찾지 못했다"고 답해야 한다(시스템 프롬프트에 명시).
 *
 * 호출 상한(설계 §4·§8): 요청당 최대 3회. 초과분은 호출하지 않고 빈 결과를 돌려준다 —
 * 모델이 루프에 빠져도 비용이 늘지 않는다.
 */

/** 요청 1건당 Places 호출 상한. */
export const MAX_TOOL_CALLS = 3;

const inputSchema = z.object({
  query: z
    .string()
    .min(1)
    .max(120)
    .describe("찾을 장소의 종류나 특징. 예: '조용한 카페', '아이와 갈 만한 박물관'"),
  near: z
    .string()
    .max(120)
    .optional()
    .describe("지역 힌트. 예: '도쿄 시부야'. 여행 자료의 도시·지역을 쓴다."),
});

/** 도구가 돌려주는(그리고 카드로 렌더되는) 결과. */
export interface SearchPlacesOutput {
  places: PlaceCandidate[];
}

/**
 * 요청 단위 도구 인스턴스. 호출 횟수를 클로저로 세므로 **요청마다 새로 만들어야** 한다.
 * 수집된 후보는 `collected` 로 노출 — 라우트가 "카드로 보낼 화이트리스트"로 쓴다(grounding 2중 방어).
 */
export function createSearchPlacesTool(signal?: AbortSignal) {
  let calls = 0;
  const collected: PlaceCandidate[] = [];

  const searchPlacesTool = tool({
    description:
      "실존하는 장소를 찾는다. 장소를 추천하기 전에 반드시 이 도구로 확인한다. " +
      "결과가 비어 있으면 장소를 지어내지 말고 찾지 못했다고 답한다.",
    inputSchema,
    execute: async ({ query, near }): Promise<SearchPlacesOutput> => {
      if (calls >= MAX_TOOL_CALLS) return { places: [] };
      calls += 1;

      const places = await searchPlaces({ query, near, signal });
      for (const place of places) {
        // place_id 기준 중복 제거 — 여러 번 검색해도 같은 장소는 한 번만 카드가 된다.
        if (!collected.some((c) => c.googlePlaceId === place.googlePlaceId)) {
          collected.push(place);
        }
      }
      return { places: places.slice(0, MAX_RESULTS) };
    },
  });

  return {
    tools: { searchPlaces: searchPlacesTool },
    /** 이번 요청에서 Places 가 실제로 확인해준 장소들(카드 화이트리스트). */
    collected,
    get callCount() {
      return calls;
    },
  };
}
