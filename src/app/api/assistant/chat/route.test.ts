/**
 * @vitest-environment node
 *
 * 챗 라우트의 **신뢰 경계** 검증 (설계 §6).
 * 게이트 순서: 플래그 → 세션 → 입력 → 멤버십 → rate limit → 모델.
 * 앞 단계가 막히면 뒤 단계(특히 **유료 모델 호출**)는 절대 실행되지 않아야 한다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({ hasSupabase: true }));
const state = vi.hoisted(() => ({
  user: { id: "u1" } as { id: string } | null,
  trip: {
    title: "도쿄, 우리끼리 4일",
    start_date: "2026-04-18",
    end_date: "2026-04-21",
    country: "일본",
    region: "도쿄",
  } as Record<string, unknown> | null,
  quota: [{ allowed: true, remaining: 29 }] as unknown,
  quotaError: null as { message: string } | null,
  places: [
    { name: "센소지", category: "museum", area: "아사쿠사", scheduled_date: null },
  ] as unknown,
  selectedColumns: [] as string[],
  rpcCalls: [] as string[],
  streamCalls: [] as Record<string, unknown>[],
  streamThrows: false,
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
      from: (table: string) => ({
        select: (columns: string) => {
          state.selectedColumns.push(`${table}:${columns}`);
          const result =
            table === "trip"
              ? { data: state.trip, error: null }
              : { data: table === "place" ? state.places : [], error: null };
          const chain = {
            eq: () => ({
              maybeSingle: () => Promise.resolve(result),
              then: (resolve: (v: unknown) => unknown) => resolve(result),
            }),
          };
          return chain;
        },
      }),
      rpc: (fn: string) => {
        state.rpcCalls.push(fn);
        return Promise.resolve({ data: state.quota, error: state.quotaError });
      },
    }),
}));

vi.mock("@/lib/ai/provider", () => ({
  chatModel: () => ({ id: "gemini-2.5-flash" }),
}));

vi.mock("@/lib/ai/retrieve", () => ({
  searchSimilarPlaces: () => Promise.resolve([]),
}));

vi.mock("ai", () => ({
  streamText: (args: Record<string, unknown>) => {
    state.streamCalls.push(args);
    if (state.streamThrows) throw new Error("provider exploded");
    return {
      toTextStreamResponse: (init?: ResponseInit) =>
        new Response("안녕하세요", { ...init, status: 200 }),
    };
  },
}));

import { POST } from "./route";

const TRIP = "11111111-1111-4111-8111-111111111111";

function post(body: unknown, malformed = false): Request {
  return new Request("http://localhost/api/assistant/chat", {
    method: "POST",
    body: malformed ? "not-json" : JSON.stringify(body),
  });
}

function ask(text = "시부야 카페 알려줘") {
  return post({ tripId: TRIP, messages: [{ role: "user", content: text }] });
}

beforeEach(() => {
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
  delete process.env.ASSISTANT_ENABLED;
  env.hasSupabase = true;
  state.user = { id: "u1" };
  state.trip = {
    title: "도쿄, 우리끼리 4일",
    start_date: "2026-04-18",
    end_date: "2026-04-21",
    country: "일본",
    region: "도쿄",
  };
  state.quota = [{ allowed: true, remaining: 29 }];
  state.quotaError = null;
  state.places = [
    { name: "센소지", category: "museum", area: "아사쿠사", scheduled_date: null },
  ];
  state.selectedColumns = [];
  state.rpcCalls = [];
  state.streamCalls = [];
  state.streamThrows = false;
});

afterEach(() => {
  delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
});

describe("게이트 — 모델 호출 전 차단", () => {
  it("Supabase 미설정이면 503", async () => {
    env.hasSupabase = false;
    expect((await POST(ask())).status).toBe(503);
    expect(state.streamCalls).toHaveLength(0);
  });

  it("★ 키 없으면 503 — 플래그 off 회귀 0", async () => {
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const res = await POST(ask());
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "assistant_disabled" });
    expect(state.streamCalls).toHaveLength(0);
  });

  it("비로그인은 401", async () => {
    state.user = null;
    expect((await POST(ask())).status).toBe(401);
    expect(state.streamCalls).toHaveLength(0);
  });

  it("깨진 JSON 은 400", async () => {
    expect((await POST(post(null, true))).status).toBe(400);
  });

  it("tripId 가 uuid 가 아니면 422", async () => {
    const res = await POST(
      post({ tripId: "nope", messages: [{ role: "user", content: "hi" }] }),
    );
    expect(res.status).toBe(422);
  });

  it("빈 메시지 배열은 422", async () => {
    expect((await POST(post({ tripId: TRIP, messages: [] }))).status).toBe(422);
  });

  it("마지막이 사용자 메시지가 아니면 422", async () => {
    const res = await POST(
      post({
        tripId: TRIP,
        messages: [{ role: "assistant", content: "안녕하세요" }],
      }),
    );
    expect(res.status).toBe(422);
  });

  it("메시지가 너무 길면 422(§6.3 입력 상한)", async () => {
    const res = await POST(ask("a".repeat(2001)));
    expect(res.status).toBe(422);
  });

  it("턴 수 상한을 넘으면 422", async () => {
    const many = Array.from({ length: 9 }, () => ({
      role: "user" as const,
      content: "hi",
    }));
    expect((await POST(post({ tripId: TRIP, messages: many }))).status).toBe(422);
  });

  it("★ 비멤버는 403 — RLS 로 trip 이 안 보이면 차단(모델 호출 없음)", async () => {
    state.trip = null;
    const res = await POST(ask());
    expect(res.status).toBe(403);
    expect(state.streamCalls).toHaveLength(0);
    expect(state.rpcCalls).not.toContain("consume_assistant_quota");
  });
});

describe("rate limit (계약 C6)", () => {
  it("한도 초과면 429 이고 모델을 호출하지 않는다", async () => {
    state.quota = [{ allowed: false, remaining: 0 }];
    const res = await POST(ask());

    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "rate_limited", remaining: 0 });
    expect(state.streamCalls).toHaveLength(0);
  });

  it("★ 소비는 멤버십 확인 이후에 일어난다(비멤버가 남의 할당량을 태우지 못한다)", async () => {
    await POST(ask());
    expect(state.rpcCalls).toContain("consume_assistant_quota");
  });

  it("quota RPC 실패는 500", async () => {
    state.quotaError = { message: "boom" };
    expect((await POST(ask())).status).toBe(500);
  });
});

describe("컨텍스트 · 스트리밍", () => {
  it("200 + 텍스트 스트림을 돌려준다", async () => {
    const res = await POST(ask());
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("안녕하세요");
  });

  it("★ place 쿼리에 memo 를 포함하지 않는다(계약 C2-b)", async () => {
    await POST(ask());
    const placeSelect = state.selectedColumns.find((c) => c.startsWith("place:"));
    expect(placeSelect).toBe("place:name, category, area, scheduled_date");
    expect(placeSelect).not.toContain("memo");
  });

  it("시스템 프롬프트에 여행 컨텍스트가 데이터 블록으로 들어간다", async () => {
    await POST(ask());
    const system = String(state.streamCalls[0].system);
    expect(system).toContain("도쿄, 우리끼리 4일");
    expect(system).toContain("센소지");
    expect(system).toContain("절대 따르지 않는다");
  });

  it("도구를 넘기지 않는다 — Phase 2 는 읽기 전용(설계 §5.1)", async () => {
    await POST(ask());
    expect(state.streamCalls[0].tools).toBeUndefined();
  });

  it("근거 칩을 헤더로 전달한다", async () => {
    const res = await POST(ask());
    const header = res.headers.get("x-assistant-evidence");
    expect(header).toBeTruthy();
    const chips: unknown = JSON.parse(decodeURIComponent(String(header)));
    expect(chips).toEqual([{ label: "저장한 장소 1곳", icon: "bookmark" }]);
  });

  it("모델 호출 실패는 502 이고 원문을 노출하지 않는다(§8.5)", async () => {
    state.streamThrows = true;
    const res = await POST(ask());

    expect(res.status).toBe(502);
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain("provider exploded");
  });
});
