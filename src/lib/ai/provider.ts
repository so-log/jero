import { z } from "zod";

import { EMBEDDING_DIM, getEmbeddingModel, getGeminiApiKey } from "./env";

/**
 * LLM provider 클라이언트 (설계 §1). **서버 전용** — 키는 이 모듈 밖으로 나가지 않는다.
 *
 * Phase 1 은 임베딩만 필요해 Gemini REST(`:embedContent` / `:batchEmbedContents`)를 직접 호출한다.
 * 스트리밍·tool calling 이 필요한 Phase 2 에서 Vercel AI SDK(`ai` + `@ai-sdk/google`)를 도입하며,
 * 그때도 **provider 접점은 이 파일 하나**로 유지한다(모델 ID·엔드포인트가 한 곳에만 존재).
 *
 * 응답은 Zod 로 검증한다 — provider 가 스키마를 바꾸면 조용히 이상한 벡터가 저장되는 대신 즉시 실패한다.
 */

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

/** 임베딩 용도. 저장(문서)과 질의는 **같은 벡터 공간**이되 task 만 다르다(계약 C2-a). */
export type EmbedTask = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

const embeddingSchema = z.object({
  values: z.array(z.number()),
});
const singleResponseSchema = z.object({ embedding: embeddingSchema });
const batchResponseSchema = z.object({ embeddings: z.array(embeddingSchema) });

/** provider 호출 실패 — 호출부는 이걸 잡아 폴백한다(설계 §7). 원문·키는 메시지에 넣지 않는다. */
export class EmbeddingProviderError extends Error {
  constructor(reason: string) {
    super(`임베딩 생성에 실패했어요 (${reason})`);
    this.name = "EmbeddingProviderError";
  }
}

async function callGemini(
  endpoint: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<unknown> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new EmbeddingProviderError("no_api_key");

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/models/${getEmbeddingModel()}:${endpoint}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    // 네트워크 오류 — 응답 본문이 없으므로 상태 코드도 없다.
    throw new EmbeddingProviderError("network");
  }

  if (!response.ok) {
    // ★ 응답 본문에 키·프롬프트가 실려 올 수 있으므로 로깅·전파하지 않는다(§8.5).
    throw new EmbeddingProviderError(`http_${response.status}`);
  }
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new EmbeddingProviderError("invalid_json");
  }
}

function contentPart(text: string) {
  return { parts: [{ text }] };
}

/** 단건 임베딩 — 원시 벡터(정규화 전)를 돌려준다. 정규화는 `embed.ts` 가 담당한다. */
export async function embedOne(
  text: string,
  task: EmbedTask,
  signal?: AbortSignal,
): Promise<number[]> {
  const model = getEmbeddingModel();
  const raw = await callGemini(
    "embedContent",
    {
      model: `models/${model}`,
      content: contentPart(text),
      taskType: task,
      outputDimensionality: EMBEDDING_DIM,
    },
    signal,
  );
  const parsed = singleResponseSchema.safeParse(raw);
  if (!parsed.success) throw new EmbeddingProviderError("unexpected_shape");
  return parsed.data.embedding.values;
}

/** 배치 임베딩 — 요청 1회로 다건(비용·지연 절감, 설계 §3.3). 입력 순서와 출력 순서가 일치한다. */
export async function embedBatch(
  texts: string[],
  task: EmbedTask,
  signal?: AbortSignal,
): Promise<number[][]> {
  if (texts.length === 0) return [];
  const model = getEmbeddingModel();
  const raw = await callGemini(
    "batchEmbedContents",
    {
      requests: texts.map((text) => ({
        model: `models/${model}`,
        content: contentPart(text),
        taskType: task,
        outputDimensionality: EMBEDDING_DIM,
      })),
    },
    signal,
  );
  const parsed = batchResponseSchema.safeParse(raw);
  if (!parsed.success) throw new EmbeddingProviderError("unexpected_shape");
  if (parsed.data.embeddings.length !== texts.length) {
    // 순서 매핑이 깨지면 엉뚱한 장소에 벡터가 붙는다 — 조용히 넘기지 않는다.
    throw new EmbeddingProviderError("count_mismatch");
  }
  return parsed.data.embeddings.map((e) => e.values);
}
