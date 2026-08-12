/**
 * @vitest-environment node
 *
 * provider 접점 검증 (설계 §1). Phase 2 에서 REST → AI SDK 로 전환했으므로
 * **호출 계약**(모델·차원·task·키 주입)과 **실패 정규화**가 그대로인지가 핵심이다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  embedCalls: [] as Record<string, unknown>[],
  embedManyCalls: [] as Record<string, unknown>[],
  embedResult: [0.1, 0.2] as number[],
  embedManyResult: [[0.1], [0.2]] as number[][],
  throws: null as Error | null,
  createdWith: null as Record<string, unknown> | null,
  embeddingModelIds: [] as string[],
  chatModelIds: [] as string[],
}));

vi.mock("@ai-sdk/google", () => ({
  createGoogle: (options: Record<string, unknown>) => {
    sdk.createdWith = options;
    return {
      embedding: (id: string) => {
        sdk.embeddingModelIds.push(id);
        return { id, kind: "embedding" };
      },
      chat: (id: string) => {
        sdk.chatModelIds.push(id);
        return { id, kind: "chat" };
      },
    };
  },
}));

vi.mock("ai", () => ({
  embed: (args: Record<string, unknown>) => {
    sdk.embedCalls.push(args);
    if (sdk.throws) return Promise.reject(sdk.throws);
    return Promise.resolve({ embedding: sdk.embedResult });
  },
  embedMany: (args: Record<string, unknown>) => {
    sdk.embedManyCalls.push(args);
    if (sdk.throws) return Promise.reject(sdk.throws);
    return Promise.resolve({ embeddings: sdk.embedManyResult });
  },
}));

import {
  chatModel,
  embedBatch,
  embedOne,
  EmbeddingProviderError,
} from "./provider";

beforeEach(() => {
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
  sdk.embedCalls = [];
  sdk.embedManyCalls = [];
  sdk.embedResult = [0.1, 0.2];
  sdk.embedManyResult = [[0.1], [0.2]];
  sdk.throws = null;
  sdk.createdWith = null;
  sdk.embeddingModelIds = [];
  sdk.chatModelIds = [];
});

afterEach(() => {
  delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  delete process.env.AI_MODEL;
});

describe("키 주입", () => {
  it("provider 에 키를 명시 주입한다(암묵적 env 의존 배제)", async () => {
    await embedOne("a", "RETRIEVAL_QUERY");
    expect(sdk.createdWith).toEqual({ apiKey: "test-key" });
  });

  it("키가 없으면 SDK 를 부르지 않고 실패한다", async () => {
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    await expect(embedOne("a", "RETRIEVAL_QUERY")).rejects.toThrow(/no_api_key/);
    expect(sdk.embedCalls).toHaveLength(0);
  });
});

describe("embedOne", () => {
  it("768 차원 + task type 을 providerOptions 로 넘긴다", async () => {
    await embedOne("안녕", "RETRIEVAL_QUERY");

    expect(sdk.embedCalls[0].providerOptions).toEqual({
      google: { outputDimensionality: 768, taskType: "RETRIEVAL_QUERY" },
    });
    expect(sdk.embedCalls[0].value).toBe("안녕");
  });

  it("임베딩 모델 ID 를 쓴다", async () => {
    await embedOne("a", "RETRIEVAL_QUERY");
    expect(sdk.embeddingModelIds).toEqual(["gemini-embedding-001"]);
  });

  it("원시 벡터를 그대로 돌려준다(정규화는 embed.ts 담당)", async () => {
    sdk.embedResult = [3, 4];
    expect(await embedOne("a", "RETRIEVAL_QUERY")).toEqual([3, 4]);
  });
});

describe("embedBatch", () => {
  it("빈 입력은 호출 없이 빈 배열", async () => {
    expect(await embedBatch([], "RETRIEVAL_DOCUMENT")).toEqual([]);
    expect(sdk.embedManyCalls).toHaveLength(0);
  });

  it("다건을 embedMany 한 번으로 묶는다", async () => {
    const result = await embedBatch(["a", "b"], "RETRIEVAL_DOCUMENT");

    expect(result).toEqual([[0.1], [0.2]]);
    expect(sdk.embedManyCalls).toHaveLength(1);
    expect(sdk.embedManyCalls[0].values).toEqual(["a", "b"]);
    expect(sdk.embedManyCalls[0].providerOptions).toEqual({
      google: { outputDimensionality: 768, taskType: "RETRIEVAL_DOCUMENT" },
    });
  });

  it("★ 응답 개수가 입력과 다르면 throw — 엉뚱한 장소에 벡터가 붙는 걸 막는다", async () => {
    sdk.embedManyResult = [[0.1]];
    await expect(embedBatch(["a", "b"], "RETRIEVAL_DOCUMENT")).rejects.toThrow(
      /count_mismatch/,
    );
  });
});

describe("실패 정규화 (§8.5)", () => {
  it("provider 예외를 EmbeddingProviderError 로 감싼다", async () => {
    sdk.throws = new Error("boom");
    await expect(embedOne("a", "RETRIEVAL_QUERY")).rejects.toBeInstanceOf(
      EmbeddingProviderError,
    );
  });

  it("★ 원본 메시지(키·프롬프트 가능)를 전파하지 않는다", async () => {
    sdk.throws = new Error("x-goog-api-key=SECRET rejected");
    await expect(embedBatch(["a"], "RETRIEVAL_DOCUMENT")).rejects.not.toThrow(
      /SECRET/,
    );
  });

  it("에러 종류(name)는 분류로 남긴다", async () => {
    const err = new Error("nope");
    err.name = "APICallError";
    sdk.throws = err;
    await expect(embedOne("a", "RETRIEVAL_QUERY")).rejects.toThrow(/APICallError/);
  });
});

describe("chatModel", () => {
  it("기본은 별칭 모델 — 실키 검증에서 고정 버전(2.5/2.0-flash)은 404 였다", () => {
    chatModel();
    expect(sdk.chatModelIds).toEqual(["gemini-flash-latest"]);
  });

  it("AI_MODEL 로 교체할 수 있다(무료 티어 정책 변동 대응)", () => {
    process.env.AI_MODEL = "gemini-2.5-pro";
    chatModel();
    expect(sdk.chatModelIds).toEqual(["gemini-2.5-pro"]);
  });
});
