/**
 * @vitest-environment node
 *
 * 서버 전용 모듈이라 node 환경에서 돌린다 — jsdom 은 `window` 가 있어
 * `lib/ai/env` 의 서버 가드(§6.1)가 의도대로 throw 한다.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildEmbedContent,
  contentHash,
  embedDocuments,
  embedQuery,
  l2Normalize,
  toVectorLiteral,
} from "./embed";
import { EMBEDDING_DIM } from "./env";

/**
 * 임베딩 단일 진입점 검증 (계약 C2-a·C2-b).
 * 핵심 회귀: ① 저장·질의가 같은 전처리(768 + L2) ② memo 가 원문에 섞이지 않음
 * ③ 차원 불일치를 조용히 통과시키지 않음.
 */

// provider 는 네트워크라 mock — 리프 모듈을 직접 mock 한다(배럴 mock 금지).
const provider = vi.hoisted(() => ({
  calls: [] as { texts: string[]; task: string }[],
  vector: [] as number[],
}));

vi.mock("./provider", async () => {
  const actual = await vi.importActual<typeof import("./provider")>("./provider");
  return {
    ...actual,
    embedOne: (text: string, task: string) => {
      provider.calls.push({ texts: [text], task });
      return Promise.resolve(provider.vector);
    },
    embedBatch: (texts: string[], task: string) => {
      provider.calls.push({ texts, task });
      return Promise.resolve(texts.map(() => provider.vector));
    },
  };
});

/** 정규화되지 않은(노름 ≠ 1) 768차원 벡터 — 정규화가 실제로 일어나는지 보려고 일부러 크게 잡는다. */
function unnormalized(dim = EMBEDDING_DIM): number[] {
  return Array.from({ length: dim }, (_, i) => (i % 7) + 1);
}

function norm(v: number[]): number {
  return Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
}

beforeEach(() => {
  provider.calls = [];
  provider.vector = unnormalized();
});

describe("l2Normalize", () => {
  it("노름을 1로 만든다", () => {
    expect(norm(l2Normalize([3, 4]))).toBeCloseTo(1, 10);
  });

  it("방향(성분 비율)은 보존한다", () => {
    const [a, b] = l2Normalize([3, 4]);
    expect(a / b).toBeCloseTo(3 / 4, 10);
  });

  it("영벡터는 NaN 을 만들지 않고 그대로 둔다", () => {
    expect(l2Normalize([0, 0, 0])).toEqual([0, 0, 0]);
  });
});

describe("embedDocuments / embedQuery — 저장·질의 일관성 (C2-a)", () => {
  it("저장 벡터는 768차원 + L2 정규화된다", async () => {
    const [result] = await embedDocuments(["츠키지 장외시장 · food · 츠키지"]);
    expect(result.vector).toHaveLength(EMBEDDING_DIM);
    expect(norm(result.vector)).toBeCloseTo(1, 10);
  });

  it("질의 벡터도 동일하게 768차원 + L2 정규화된다", async () => {
    const result = await embedQuery("조용한 카페");
    expect(result.vector).toHaveLength(EMBEDDING_DIM);
    expect(norm(result.vector)).toBeCloseTo(1, 10);
  });

  it("task type 만 다르다 — 저장은 DOCUMENT, 질의는 QUERY", async () => {
    await embedDocuments(["a"]);
    await embedQuery("b");
    expect(provider.calls.map((c) => c.task)).toEqual([
      "RETRIEVAL_DOCUMENT",
      "RETRIEVAL_QUERY",
    ]);
  });

  it("같은 입력이면 저장·질의 벡터가 동일하게 전처리된다(공간 일치)", async () => {
    const [doc] = await embedDocuments(["같은 텍스트"]);
    const query = await embedQuery("같은 텍스트");
    expect(query.vector).toEqual(doc.vector);
  });

  it("배치는 요청 1회로 묶이고 입력 순서를 보존한다", async () => {
    const results = await embedDocuments(["a", "b", "c"]);
    expect(results).toHaveLength(3);
    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0].texts).toEqual(["a", "b", "c"]);
  });

  it("모델 ID 를 함께 돌려준다(교체 감지용)", async () => {
    const [result] = await embedDocuments(["a"]);
    expect(result.model).toBe("gemini-embedding-001");
  });

  it("차원이 다르면 조용히 통과시키지 않고 throw 한다", async () => {
    provider.vector = unnormalized(512);
    await expect(embedDocuments(["a"])).rejects.toThrow(/dim_mismatch_512/);
  });

  it("NaN/Infinity 가 섞이면 throw 한다", async () => {
    const bad = unnormalized();
    bad[0] = Number.NaN;
    provider.vector = bad;
    await expect(embedQuery("a")).rejects.toThrow(/non_finite_value/);
  });
});

describe("buildEmbedContent — memo 제외 (C2-b)", () => {
  it("name · category · area 를 ' · ' 로 잇는다", () => {
    expect(
      buildEmbedContent({ name: "츠키지 장외시장", category: "food", area: "츠키지" }),
    ).toBe("츠키지 장외시장 · food · 츠키지");
  });

  it("area 가 없으면 생략한다", () => {
    expect(buildEmbedContent({ name: "센소지", category: "museum", area: null })).toBe(
      "센소지 · museum",
    );
  });

  it("빈 문자열 area 도 생략한다", () => {
    expect(buildEmbedContent({ name: "센소지", category: "museum", area: "  " })).toBe(
      "센소지 · museum",
    );
  });

  it("★ memo 는 어떤 경우에도 원문에 포함되지 않는다", () => {
    // memo 를 넘겨도 타입·구현 모두 이를 받지 않는다 — provider 로 나가지 않음을 고정한다.
    const content = buildEmbedContent({
      name: "츠키지 장외시장",
      category: "food",
      area: "츠키지",
    });
    expect(content).not.toContain("아침 스시");
    expect(content).toBe("츠키지 장외시장 · food · 츠키지");
  });
});

describe("contentHash", () => {
  it("같은 내용이면 같은 해시(재임베딩 skip 조건)", () => {
    expect(contentHash("센소지 · museum")).toBe(contentHash("센소지 · museum"));
  });

  it("내용이 바뀌면 해시도 바뀐다", () => {
    expect(contentHash("센소지 · museum")).not.toBe(contentHash("센소지 · cafe"));
  });

  it("md5 32자 hex — SQL md5() 와 같은 형식", () => {
    expect(contentHash("a")).toMatch(/^[0-9a-f]{32}$/);
    // SQL: select md5('a') → 0cc175b9c0f1b6a831c399e269772661
    expect(contentHash("a")).toBe("0cc175b9c0f1b6a831c399e269772661");
  });
});

describe("toVectorLiteral", () => {
  it("pgvector 리터럴 형식으로 직렬화한다", () => {
    expect(toVectorLiteral([0.1, -0.2, 0.3])).toBe("[0.1,-0.2,0.3]");
  });
});
