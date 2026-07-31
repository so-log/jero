/**
 * @vitest-environment node
 *
 * 유사 검색 배선 (설계 §3.4). Phase 2 챗이 소비하지만 계약은 지금 고정한다.
 * 핵심: ① 질의 벡터가 pgvector 리터럴로 넘어간다 ② 실패는 빈 배열로 흡수(RAG 없이도 동작).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  rows: [] as unknown,
  error: null as { message: string } | null,
  calls: [] as { fn: string; args: Record<string, unknown> }[],
  embedThrows: false,
}));

vi.mock("./embed", async () => {
  const actual = await vi.importActual<typeof import("./embed")>("./embed");
  return {
    ...actual,
    embedQuery: () => {
      if (state.embedThrows) return Promise.reject(new Error("provider down"));
      return Promise.resolve({ vector: [0.5, -0.5], model: "gemini-embedding-001" });
    },
  };
});

import { searchSimilarPlaces } from "./retrieve";

function fakeSupabase(): SupabaseClient {
  return {
    rpc: (fn: string, args: Record<string, unknown>) => {
      state.calls.push({ fn, args });
      return Promise.resolve({ data: state.rows, error: state.error });
    },
  } as unknown as SupabaseClient;
}

beforeEach(() => {
  state.rows = [];
  state.error = null;
  state.calls = [];
  state.embedThrows = false;
});

describe("searchSimilarPlaces", () => {
  it("match_place_embeddings 를 pgvector 리터럴로 호출한다", async () => {
    await searchSimilarPlaces(fakeSupabase(), "trip_1", "조용한 카페");

    expect(state.calls[0].fn).toBe("match_place_embeddings");
    expect(state.calls[0].args).toEqual({
      p_trip_id: "trip_1",
      p_query: "[0.5,-0.5]",
      p_limit: 8,
    });
  });

  it("유사 장소를 검증된 형태로 돌려준다", async () => {
    state.rows = [
      { place_id: "p1", content: "츠키지 장외시장 · food · 츠키지", similarity: 0.82 },
    ];
    const result = await searchSimilarPlaces(fakeSupabase(), "trip_1", "시장");

    expect(result).toEqual([
      { place_id: "p1", content: "츠키지 장외시장 · food · 츠키지", similarity: 0.82 },
    ]);
  });

  it("limit 를 넘길 수 있다", async () => {
    await searchSimilarPlaces(fakeSupabase(), "trip_1", "q", 3);
    expect(state.calls[0].args.p_limit).toBe(3);
  });

  it("★ 임베딩 실패는 빈 배열 — RAG 없이도 어시스턴트는 계속 동작(폴백 §7)", async () => {
    state.embedThrows = true;
    const result = await searchSimilarPlaces(fakeSupabase(), "trip_1", "q");

    expect(result).toEqual([]);
    expect(state.calls).toHaveLength(0); // 임베딩이 없으면 RPC 도 안 부른다
  });

  it("RPC 실패도 빈 배열로 흡수한다", async () => {
    state.error = { message: "boom" };
    expect(await searchSimilarPlaces(fakeSupabase(), "trip_1", "q")).toEqual([]);
  });

  it("비멤버(RLS 0행)는 빈 배열", async () => {
    state.rows = [];
    expect(await searchSimilarPlaces(fakeSupabase(), "trip_other", "q")).toEqual([]);
  });

  it("예상과 다른 응답 형태는 빈 배열로 막는다", async () => {
    state.rows = [{ unexpected: true }];
    expect(await searchSimilarPlaces(fakeSupabase(), "trip_1", "q")).toEqual([]);
  });
});
