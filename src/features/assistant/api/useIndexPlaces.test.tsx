import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_INDEX_ROUNDS, useIndexPlaces } from "./useIndexPlaces";

/**
 * 인덱싱 트리거 (설계 §3.3). 검증 축:
 *  ① 활성일 때 **진입 1회** 호출 · 재렌더로 다시 쏘지 않는다
 *  ② `hasMore` 면 상한까지 이어서 호출한다
 *  ③ **비활성이면 요청 자체가 없다**(기존 화면 회귀 0)
 *  ④ 실패해도 **던지지 않는다**(fire-and-forget — 워크스페이스가 깨지면 안 된다)
 */

const TRIP = "11111111-1111-4111-8111-111111111111";
const OTHER_TRIP = "22222222-2222-4222-8222-222222222222";

/** 호출 순서대로 hasMore 를 돌려주는 fetch 스텁. */
function stubFetch(hasMoreSequence: boolean[]): ReturnType<typeof vi.fn> {
  let call = 0;
  const fetchMock = vi.fn(() => {
    const hasMore = hasMoreSequence[call] ?? false;
    call += 1;
    return Promise.resolve(
      new Response(JSON.stringify({ indexed: 1, hasMore }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** 이 훅의 fetch 호출만 추린다. */
const indexCalls = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls.filter(([url]) => url === "/api/assistant/index");

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useIndexPlaces — 트리거", () => {
  it("활성이면 진입 시 tripId 로 한 번 호출한다", async () => {
    const fetchMock = stubFetch([false]);
    renderHook(() => useIndexPlaces(TRIP, true));

    await waitFor(() => expect(indexCalls(fetchMock)).toHaveLength(1));

    const [url, init] = indexCalls(fetchMock)[0] as [string, RequestInit];
    expect(url).toBe("/api/assistant/index");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ tripId: TRIP });
  });

  it("★ 재렌더로는 다시 호출하지 않는다", async () => {
    const fetchMock = stubFetch([false]);
    const { rerender } = renderHook(() => useIndexPlaces(TRIP, true));

    await waitFor(() => expect(indexCalls(fetchMock)).toHaveLength(1));
    rerender();
    rerender();
    rerender();

    expect(indexCalls(fetchMock)).toHaveLength(1);
  });

  it("여행이 바뀌면 새로 인덱싱한다", async () => {
    const fetchMock = stubFetch([false, false]);
    const { rerender } = renderHook(
      ({ trip }: { trip: string }) => useIndexPlaces(trip, true),
      { initialProps: { trip: TRIP } },
    );

    await waitFor(() => expect(indexCalls(fetchMock)).toHaveLength(1));
    rerender({ trip: OTHER_TRIP });

    await waitFor(() => expect(indexCalls(fetchMock)).toHaveLength(2));
    expect(JSON.parse(String((indexCalls(fetchMock)[1] as [string, RequestInit])[1].body))).toEqual(
      { tripId: OTHER_TRIP },
    );
  });
});

describe("useIndexPlaces — 회귀 0", () => {
  it("★ 어시스턴트가 비활성이면 요청을 보내지 않는다", async () => {
    const fetchMock = stubFetch([false]);
    renderHook(() => useIndexPlaces(TRIP, false));

    // 활성화됐다면 떴을 시간을 준다.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(indexCalls(fetchMock)).toHaveLength(0);
  });

  it("tripId 가 비어 있으면 호출하지 않는다", async () => {
    const fetchMock = stubFetch([false]);
    renderHook(() => useIndexPlaces("", true));

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(indexCalls(fetchMock)).toHaveLength(0);
  });

  it("비활성 → 활성으로 바뀌면 그때 호출한다", async () => {
    const fetchMock = stubFetch([false]);
    const { rerender } = renderHook(
      ({ on }: { on: boolean }) => useIndexPlaces(TRIP, on),
      { initialProps: { on: false } },
    );

    expect(indexCalls(fetchMock)).toHaveLength(0);
    rerender({ on: true });

    await waitFor(() => expect(indexCalls(fetchMock)).toHaveLength(1));
  });
});

describe("useIndexPlaces — 배치 이어받기", () => {
  it("hasMore 면 다음 배치를 이어서 호출한다", async () => {
    const fetchMock = stubFetch([true, true, false]);
    renderHook(() => useIndexPlaces(TRIP, true));

    await waitFor(() => expect(indexCalls(fetchMock)).toHaveLength(3));
    // 마지막이 hasMore=false 라 여기서 멈춘다.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(indexCalls(fetchMock)).toHaveLength(3);
  });

  it("★ hasMore 가 계속 true 여도 상한에서 멈춘다(무한 루프 차단)", async () => {
    const fetchMock = stubFetch([true, true, true, true, true, true]);
    renderHook(() => useIndexPlaces(TRIP, true));

    await waitFor(() =>
      expect(indexCalls(fetchMock)).toHaveLength(MAX_INDEX_ROUNDS),
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(indexCalls(fetchMock)).toHaveLength(MAX_INDEX_ROUNDS);
  });
});

describe("useIndexPlaces — 실패 허용(fire-and-forget)", () => {
  it("★ 서버가 실패해도 던지지 않고 루프를 멈춘다", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: "index_failed" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    expect(() => renderHook(() => useIndexPlaces(TRIP, true))).not.toThrow();

    await waitFor(() => expect(indexCalls(fetchMock)).toHaveLength(1));
    await new Promise((resolve) => setTimeout(resolve, 20));
    // 실패는 "더 없음"으로 취급 — 재시도로 서버를 두드리지 않는다.
    expect(indexCalls(fetchMock)).toHaveLength(1);
  });

  it("★ 네트워크 자체가 실패해도 조용히 넘어간다", async () => {
    const fetchMock = vi.fn(() => Promise.reject(new Error("network down")));
    vi.stubGlobal("fetch", fetchMock);

    expect(() => renderHook(() => useIndexPlaces(TRIP, true))).not.toThrow();

    await waitFor(() => expect(indexCalls(fetchMock)).toHaveLength(1));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(indexCalls(fetchMock)).toHaveLength(1);
  });

  it("어시스턴트 비활성(503) 응답이면 더 부르지 않는다", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: "assistant_disabled" }), {
          status: 503,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderHook(() => useIndexPlaces(TRIP, true));

    await waitFor(() => expect(indexCalls(fetchMock)).toHaveLength(1));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(indexCalls(fetchMock)).toHaveLength(1);
  });
});
