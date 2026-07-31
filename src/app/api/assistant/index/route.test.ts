/**
 * @vitest-environment node
 *
 * 인덱싱 라우트의 **신뢰 경계** 검증 (설계 §6.2, 계약 C1-a).
 * 순서가 중요하다: 플래그 → 세션 → 입력 → DB. 앞 단계가 막히면 뒤 단계는 호출되지 않아야 한다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({ hasSupabase: true }));
const state = vi.hoisted(() => ({
  user: { id: "u1" } as { id: string } | null,
  stale: [] as { place_id: string; content: string }[],
  staleError: null as { message: string } | null,
  upsertErrorFor: new Set<string>(),
  rpcCalls: [] as { fn: string; args: Record<string, unknown> }[],
  embedCalls: 0,
  embedThrows: false,
}));

vi.mock("@/lib/supabase/env", () => ({
  get hasSupabase() {
    return env.hasSupabase;
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: () =>
    Promise.resolve({
      auth: { getUser: () => Promise.resolve({ data: { user: state.user } }) },
      rpc: (fn: string, args: Record<string, unknown>) => {
        state.rpcCalls.push({ fn, args });
        if (fn === "stale_place_embeddings") {
          return Promise.resolve({ data: state.stale, error: state.staleError });
        }
        const placeId = String(args.p_place_id);
        return Promise.resolve({
          data: null,
          error: state.upsertErrorFor.has(placeId) ? { message: "forbidden" } : null,
        });
      },
    }),
}));

vi.mock("@/lib/ai/embed", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai/embed")>("@/lib/ai/embed");
  return {
    ...actual,
    embedDocuments: (texts: string[]) => {
      state.embedCalls += 1;
      if (state.embedThrows) return Promise.reject(new Error("provider down"));
      return Promise.resolve(
        texts.map(() => ({ vector: [0.1, 0.2], model: "gemini-embedding-001" })),
      );
    },
  };
});

import { POST } from "./route";

const TRIP = "11111111-1111-4111-8111-111111111111";

function post(body: unknown, malformed = false): Request {
  return new Request("http://localhost/api/assistant/index", {
    method: "POST",
    body: malformed ? "not-json" : JSON.stringify(body),
  });
}

beforeEach(() => {
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
  delete process.env.ASSISTANT_ENABLED;
  env.hasSupabase = true;
  state.user = { id: "u1" };
  state.stale = [{ place_id: "p1", content: "센소지 · museum · 아사쿠사" }];
  state.staleError = null;
  state.upsertErrorFor = new Set();
  state.rpcCalls = [];
  state.embedCalls = 0;
  state.embedThrows = false;
});

afterEach(() => {
  delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
});

describe("POST /api/assistant/index — 게이트", () => {
  it("Supabase 미설정이면 503 (기존 동작 무영향)", async () => {
    env.hasSupabase = false;
    const res = await POST(post({ tripId: TRIP }));
    expect(res.status).toBe(503);
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("★ 키가 없으면 503 — 플래그 off 시 인덱싱 자체가 없다(회귀 0)", async () => {
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const res = await POST(post({ tripId: TRIP }));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "assistant_disabled" });
    expect(state.embedCalls).toBe(0);
  });

  it("ASSISTANT_ENABLED=false 면 키가 있어도 503", async () => {
    process.env.ASSISTANT_ENABLED = "false";
    const res = await POST(post({ tripId: TRIP }));
    expect(res.status).toBe(503);
  });

  it("비로그인은 401 — DB 도 provider 도 건드리지 않는다", async () => {
    state.user = null;
    const res = await POST(post({ tripId: TRIP }));
    expect(res.status).toBe(401);
    expect(state.rpcCalls).toHaveLength(0);
    expect(state.embedCalls).toBe(0);
  });

  it("깨진 JSON 은 400", async () => {
    const res = await POST(post(null, true));
    expect(res.status).toBe(400);
  });

  it("tripId 가 uuid 가 아니면 422", async () => {
    const res = await POST(post({ tripId: "not-a-uuid" }));
    expect(res.status).toBe(422);
    expect(state.rpcCalls).toHaveLength(0);
  });
});

describe("POST /api/assistant/index — 인덱싱", () => {
  it("변경분을 임베딩해 definer RPC 로 upsert 한다", async () => {
    const res = await POST(post({ tripId: TRIP }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ indexed: 1, hasMore: false });

    const upsert = state.rpcCalls.find((c) => c.fn === "upsert_place_embedding");
    expect(upsert?.args.p_place_id).toBe("p1");
    expect(upsert?.args.p_model).toBe("gemini-embedding-001");
    // pgvector 리터럴로 직렬화되어 넘어간다.
    expect(upsert?.args.p_embedding).toBe("[0.1,0.2]");
  });

  it("★ trip_id·content 를 클라가 넘기지 않는다 — DB 가 place 행에서 파생(C1-a)", async () => {
    await POST(post({ tripId: TRIP }));
    const upsert = state.rpcCalls.find((c) => c.fn === "upsert_place_embedding");
    expect(Object.keys(upsert?.args ?? {})).toEqual([
      "p_place_id",
      "p_embedding",
      "p_model",
    ]);
  });

  it("★ 변경분이 없으면 임베딩을 호출하지 않는다(비용 절감)", async () => {
    state.stale = [];
    const res = await POST(post({ tripId: TRIP }));
    expect(await res.json()).toEqual({ indexed: 0, hasMore: false });
    expect(state.embedCalls).toBe(0);
  });

  it("여러 장소도 임베딩 요청은 1회(배치)", async () => {
    state.stale = [
      { place_id: "p1", content: "a" },
      { place_id: "p2", content: "b" },
      { place_id: "p3", content: "c" },
    ];
    const res = await POST(post({ tripId: TRIP }));
    expect(await res.json()).toMatchObject({ indexed: 3 });
    expect(state.embedCalls).toBe(1);
  });

  it("빈 content 는 대상에서 제외한다", async () => {
    state.stale = [
      { place_id: "p1", content: "   " },
      { place_id: "p2", content: "센소지 · museum" },
    ];
    await POST(post({ tripId: TRIP }));
    const upserts = state.rpcCalls.filter((c) => c.fn === "upsert_place_embedding");
    expect(upserts.map((u) => u.args.p_place_id)).toEqual(["p2"]);
  });

  it("개별 upsert 실패(권한 등)는 건너뛰고 나머지를 계속 인덱싱한다", async () => {
    state.stale = [
      { place_id: "p1", content: "a" },
      { place_id: "p2", content: "b" },
    ];
    state.upsertErrorFor = new Set(["p1"]);
    const res = await POST(post({ tripId: TRIP }));
    expect(await res.json()).toMatchObject({ indexed: 1 });
  });

  it("임베딩 provider 실패는 502 — 부분 저장 없음", async () => {
    state.embedThrows = true;
    const res = await POST(post({ tripId: TRIP }));

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "embedding_failed" });
    expect(state.rpcCalls.some((c) => c.fn === "upsert_place_embedding")).toBe(false);
  });

  it("stale 조회 실패는 500", async () => {
    state.staleError = { message: "boom" };
    const res = await POST(post({ tripId: TRIP }));
    expect(res.status).toBe(500);
  });

  it("에러 응답에 provider 원문·키가 실리지 않는다(§8.5)", async () => {
    state.embedThrows = true;
    const res = await POST(post({ tripId: TRIP }));
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain("provider down");
    expect(text).not.toContain("test-key");
  });
});
