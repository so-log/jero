/**
 * @vitest-environment node
 *
 * Places grounding 근거원 (설계 §4). 핵심: **좌표 없는 후보는 탈락**, 실패는 빈 배열.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearPlacesCache, inferCategory, searchPlaces } from "./places";

function place(overrides: Record<string, unknown> = {}) {
  return {
    id: "ChIJ_test",
    displayName: { text: "블루보틀 아오야마" },
    formattedAddress: "도쿄도 미나토구 미나미아오야마",
    location: { latitude: 35.6672, longitude: 139.7118 },
    types: ["cafe"],
    ...overrides,
  };
}

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  process.env.GOOGLE_PLACES_SERVER_KEY = "server-key";
  clearPlacesCache();
});

afterEach(() => {
  delete process.env.GOOGLE_PLACES_SERVER_KEY;
  vi.unstubAllGlobals();
});

describe("searchPlaces — 요청", () => {
  it("Places API (New) searchText 에 서버 키를 헤더로 보낸다", async () => {
    const spy = vi.fn(() => Promise.resolve(ok({ places: [place()] })));
    vi.stubGlobal("fetch", spy);

    await searchPlaces({ query: "조용한 카페" });

    const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://places.googleapis.com/v1/places:searchText");
    const headers = init.headers as Record<string, string>;
    expect(headers["x-goog-api-key"]).toBe("server-key");
    // 필드 마스크로 필요한 필드만 — 과금 tier 관리(설계 §8).
    expect(headers["x-goog-fieldmask"]).toContain("places.location");
    expect(url).not.toContain("server-key");
  });

  it("near 힌트를 쿼리에 합친다", async () => {
    const spy = vi.fn(() => Promise.resolve(ok({ places: [] })));
    vi.stubGlobal("fetch", spy);

    await searchPlaces({ query: "카페", near: "도쿄 시부야" });

    const body = JSON.parse(
      String((spy.mock.calls[0] as unknown as [string, RequestInit])[1].body),
    ) as { textQuery: string; maxResultCount: number };
    expect(body.textQuery).toBe("도쿄 시부야 카페");
    expect(body.maxResultCount).toBe(5);
  });

  it("키가 없으면 호출하지 않고 빈 배열", async () => {
    delete process.env.GOOGLE_PLACES_SERVER_KEY;
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);

    expect(await searchPlaces({ query: "카페" })).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it("빈 쿼리는 호출하지 않는다", async () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    expect(await searchPlaces({ query: "   " })).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("searchPlaces — grounding 필터", () => {
  it("실존 장소를 좌표·place_id 와 함께 돌려준다", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(ok({ places: [place()] }))));

    const [result] = await searchPlaces({ query: "카페" });

    expect(result).toEqual({
      name: "블루보틀 아오야마",
      address: "도쿄도 미나토구 미나미아오야마",
      lat: 35.6672,
      lng: 139.7118,
      googlePlaceId: "ChIJ_test",
      category: "cafe",
    });
  });

  it("★ 좌표 없는 후보는 제외한다(지도·일정에 반영 불가)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          ok({
            places: [
              place({ id: "a", location: undefined }),
              place({ id: "b" }),
            ],
          }),
        ),
      ),
    );

    const result = await searchPlaces({ query: "카페" });
    expect(result.map((r) => r.googlePlaceId)).toEqual(["b"]);
  });

  it("★ place_id 없는 후보도 제외한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(ok({ places: [place({ id: undefined })] }))),
    );
    expect(await searchPlaces({ query: "카페" })).toEqual([]);
  });

  it("이름 없는 후보도 제외한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(ok({ places: [place({ displayName: undefined })] }))),
    );
    expect(await searchPlaces({ query: "카페" })).toEqual([]);
  });

  it("최대 5건으로 자른다", async () => {
    const many = Array.from({ length: 9 }, (_, i) => place({ id: `p${i}` }));
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(ok({ places: many }))));
    expect(await searchPlaces({ query: "카페" })).toHaveLength(5);
  });
});

describe("searchPlaces — 실패 흡수 (설계 §7)", () => {
  it("HTTP 오류는 빈 배열(모델은 '못 찾았다'고 답해야 한다)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("quota", { status: 429 }))),
    );
    expect(await searchPlaces({ query: "카페" })).toEqual([]);
  });

  it("네트워크 예외도 빈 배열", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("offline"))),
    );
    expect(await searchPlaces({ query: "카페" })).toEqual([]);
  });

  it("예상과 다른 응답 형태도 빈 배열", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(ok({ unexpected: 1 }))));
    expect(await searchPlaces({ query: "카페" })).toEqual([]);
  });
});

describe("searchPlaces — 캐시 (설계 §8)", () => {
  it("같은 쿼리는 두 번째부터 호출하지 않는다", async () => {
    const spy = vi.fn(() => Promise.resolve(ok({ places: [place()] })));
    vi.stubGlobal("fetch", spy);

    await searchPlaces({ query: "카페", near: "시부야" });
    await searchPlaces({ query: "카페", near: "시부야" });

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("쿼리가 다르면 새로 호출한다", async () => {
    const spy = vi.fn(() => Promise.resolve(ok({ places: [place()] })));
    vi.stubGlobal("fetch", spy);

    await searchPlaces({ query: "카페" });
    await searchPlaces({ query: "맛집" });

    expect(spy).toHaveBeenCalledTimes(2);
  });
});

describe("inferCategory", () => {
  it.each([
    [["cafe"], "cafe"],
    [["restaurant"], "food"],
    [["lodging"], "hotel"],
    [["museum"], "museum"],
    [["subway_station"], "transport"],
    [["shopping_mall"], "shopping"],
    [["gift_shop"], "gift"],
  ])("%s → %s", (types, expected) => {
    expect(inferCategory(types)).toBe(expected);
  });

  it("모르는 타입·빈 값은 etc", () => {
    expect(inferCategory(["something_new"])).toBe("etc");
    expect(inferCategory([])).toBe("etc");
    expect(inferCategory(undefined)).toBe("etc");
  });

  it("카페가 음식점보다 우선한다(카페는 restaurant 타입도 함께 갖는다)", () => {
    expect(inferCategory(["restaurant", "cafe"])).toBe("cafe");
  });
});
