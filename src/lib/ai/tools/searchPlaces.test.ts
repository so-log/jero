/**
 * @vitest-environment node
 *
 * searchPlaces 도구 (설계 §5.1). 핵심: **호출 상한**과 **collected 화이트리스트**.
 * `collected` 가 카드의 유일한 출처이므로, 여기 없는 장소는 절대 카드가 되지 않는다.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PlaceCandidate } from "../places";

const places = vi.hoisted(() => ({
  results: [] as PlaceCandidate[],
  calls: [] as { query: string; near?: string }[],
}));

vi.mock("../places", async () => {
  const actual = await vi.importActual<typeof import("../places")>("../places");
  return {
    ...actual,
    searchPlaces: ({ query, near }: { query: string; near?: string }) => {
      places.calls.push({ query, near });
      return Promise.resolve(places.results);
    },
  };
});

import { createSearchPlacesTool, MAX_TOOL_CALLS } from "./searchPlaces";

function candidate(id: string, name = id): PlaceCandidate {
  return {
    name,
    address: "주소",
    lat: 35.6,
    lng: 139.7,
    googlePlaceId: id,
    category: "cafe",
  };
}

/** 도구의 execute 를 직접 부른다(모델 루프 없이 계약만 검증). */
async function run(
  toolset: ReturnType<typeof createSearchPlacesTool>,
  query: string,
  near?: string,
) {
  const execute = toolset.tools.searchPlaces.execute;
  if (!execute) throw new Error("execute 없음");
  return execute({ query, near }, { toolCallId: "t", messages: [], context: {} });
}

beforeEach(() => {
  places.results = [candidate("a"), candidate("b")];
  places.calls = [];
});

describe("createSearchPlacesTool", () => {
  it("검색 결과를 그대로 돌려준다", async () => {
    const t = createSearchPlacesTool();
    const out = await run(t, "조용한 카페", "도쿄 시부야");

    expect(out).toEqual({ places: [candidate("a"), candidate("b")] });
    expect(places.calls[0]).toEqual({ query: "조용한 카페", near: "도쿄 시부야" });
  });

  it("★ 확인된 장소를 collected 에 모은다(카드 화이트리스트)", async () => {
    const t = createSearchPlacesTool();
    await run(t, "카페");

    expect(t.collected.map((c) => c.googlePlaceId)).toEqual(["a", "b"]);
  });

  it("여러 번 검색해도 같은 장소는 한 번만 모은다", async () => {
    const t = createSearchPlacesTool();
    await run(t, "카페");
    places.results = [candidate("b"), candidate("c")];
    await run(t, "맛집");

    expect(t.collected.map((c) => c.googlePlaceId)).toEqual(["a", "b", "c"]);
  });

  it(`★ 호출 상한 ${MAX_TOOL_CALLS}회 — 넘으면 Places 를 부르지 않는다(비용 폭주 차단)`, async () => {
    const t = createSearchPlacesTool();
    for (let i = 0; i < MAX_TOOL_CALLS + 3; i += 1) {
      await run(t, `쿼리${i}`);
    }

    expect(places.calls).toHaveLength(MAX_TOOL_CALLS);
    expect(t.callCount).toBe(MAX_TOOL_CALLS);
  });

  it("상한 초과 호출은 빈 결과를 준다(모델은 '못 찾았다'로 답한다)", async () => {
    const t = createSearchPlacesTool();
    for (let i = 0; i < MAX_TOOL_CALLS; i += 1) await run(t, `q${i}`);

    expect(await run(t, "한 번 더")).toEqual({ places: [] });
  });

  it("요청마다 카운터가 독립적이다(인스턴스 격리)", async () => {
    const first = createSearchPlacesTool();
    for (let i = 0; i < MAX_TOOL_CALLS; i += 1) await run(first, `q${i}`);

    const second = createSearchPlacesTool();
    await run(second, "새 요청");

    expect(second.callCount).toBe(1);
    expect(second.collected).toHaveLength(2);
  });

  it("검색 결과가 없으면 collected 도 비어 있다", async () => {
    places.results = [];
    const t = createSearchPlacesTool();

    expect(await run(t, "없는 장소")).toEqual({ places: [] });
    expect(t.collected).toEqual([]);
  });
});
