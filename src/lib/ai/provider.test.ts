/**
 * @vitest-environment node
 *
 * provider 응답 검증 (설계 §1). provider 가 스키마를 바꾸거나 실패했을 때
 * **조용히 이상한 벡터가 저장되지 않고 즉시 실패**하는지가 핵심이다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { embedBatch, embedOne, EmbeddingProviderError } from "./provider";

const ORIGINAL_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

function mockFetch(impl: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const spy = vi.fn(impl as unknown as typeof fetch);
  vi.stubGlobal("fetch", spy);
  return spy;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = ORIGINAL_KEY;
});

describe("embedOne", () => {
  it("768 요청 파라미터와 task type 을 실어 보낸다", async () => {
    const spy = mockFetch(() => json({ embedding: { values: [1, 2, 3] } }));
    await embedOne("안녕", "RETRIEVAL_QUERY");

    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("gemini-embedding-001:embedContent");
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.taskType).toBe("RETRIEVAL_QUERY");
    expect(body.outputDimensionality).toBe(768);
  });

  it("키를 쿼리스트링이 아니라 헤더로 보낸다(URL·로그 노출 방지)", async () => {
    const spy = mockFetch(() => json({ embedding: { values: [1] } }));
    await embedOne("a", "RETRIEVAL_QUERY");

    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).not.toContain("test-key");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-key");
  });

  it("키가 없으면 네트워크 호출 없이 실패한다", async () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "";
    const spy = mockFetch(() => json({}));
    await expect(embedOne("a", "RETRIEVAL_QUERY")).rejects.toThrow(/no_api_key/);
    expect(spy).not.toHaveBeenCalled();
  });

  it("HTTP 에러는 상태 코드만 노출한다(응답 본문 전파 금지 — §8.5)", async () => {
    mockFetch(() => json({ error: { message: "key=SECRET leaked" } }, 429));
    await expect(embedOne("a", "RETRIEVAL_QUERY")).rejects.toThrow(
      /http_429/,
    );
    await expect(embedOne("a", "RETRIEVAL_QUERY")).rejects.not.toThrow(/SECRET/);
  });

  it("예상과 다른 응답 형태는 throw 한다", async () => {
    mockFetch(() => json({ unexpected: true }));
    await expect(embedOne("a", "RETRIEVAL_QUERY")).rejects.toThrow(/unexpected_shape/);
  });

  it("네트워크 오류를 흡수하지 않고 EmbeddingProviderError 로 감싼다", async () => {
    mockFetch(() => {
      throw new Error("ECONNREFUSED");
    });
    await expect(embedOne("a", "RETRIEVAL_QUERY")).rejects.toBeInstanceOf(
      EmbeddingProviderError,
    );
  });
});

describe("embedBatch", () => {
  it("빈 입력은 호출 없이 빈 배열", async () => {
    const spy = mockFetch(() => json({}));
    expect(await embedBatch([], "RETRIEVAL_DOCUMENT")).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it("다건을 요청 1회로 묶는다", async () => {
    const spy = mockFetch(() =>
      json({ embeddings: [{ values: [1] }, { values: [2] }] }),
    );
    const result = await embedBatch(["a", "b"], "RETRIEVAL_DOCUMENT");

    expect(result).toEqual([[1], [2]]);
    expect(spy).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String((spy.mock.calls[0] as [string, RequestInit])[1].body));
    expect(body.requests).toHaveLength(2);
  });

  it("★ 응답 개수가 입력과 다르면 throw — 엉뚱한 장소에 벡터가 붙는 걸 막는다", async () => {
    mockFetch(() => json({ embeddings: [{ values: [1] }] }));
    await expect(embedBatch(["a", "b"], "RETRIEVAL_DOCUMENT")).rejects.toThrow(
      /count_mismatch/,
    );
  });
});
