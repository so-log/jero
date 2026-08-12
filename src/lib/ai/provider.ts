import { createGoogle } from "@ai-sdk/google";
import { embed, embedMany, type LanguageModel } from "ai";

import { EMBEDDING_DIM, getChatModel, getEmbeddingModel, getGeminiApiKey } from "./env";

/**
 * LLM provider 접점 (설계 §1). **서버 전용** — 키는 이 모듈 밖으로 나가지 않는다.
 *
 * Phase 2 에서 Vercel AI SDK(`ai` + `@ai-sdk/google`)로 전환했다. Phase 1 의 REST 직접 호출은
 * 이 파일 안에서만 교체됐고 **export 시그니처는 그대로**라 `embed.ts` 이하 경로는 무변경이다.
 * 모델 ID·엔드포인트·키는 계속 이 파일 하나에만 존재한다.
 */

/** 임베딩 용도. 저장(문서)과 질의는 **같은 벡터 공간**이되 task 만 다르다(계약 C2-a). */
export type EmbedTask = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

/** provider 호출 실패 — 호출부는 이걸 잡아 폴백한다(설계 §7). 원문·키는 메시지에 넣지 않는다. */
export class EmbeddingProviderError extends Error {
  constructor(reason: string) {
    super(`임베딩 생성에 실패했어요 (${reason})`);
    this.name = "EmbeddingProviderError";
  }
}

/** AI SDK provider 인스턴스. 키는 명시 주입한다(암묵적 env 의존을 피해 테스트·검증이 쉬워진다). */
function googleProvider() {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new EmbeddingProviderError("no_api_key");
  return createGoogle({ apiKey });
}

/** 채팅 모델 — `streamText` 에 넘긴다(Phase 2 챗 라우트). */
export function chatModel(): LanguageModel {
  return googleProvider().chat(getChatModel());
}

/** 임베딩 provider 옵션 — 차원·task 는 여기서만 정해진다(계약 C2). */
function embeddingOptions(task: EmbedTask) {
  return {
    google: { outputDimensionality: EMBEDDING_DIM, taskType: task },
  };
}

/**
 * provider 예외를 EmbeddingProviderError 로 정규화한다.
 * ★ 원본 메시지는 키·프롬프트를 담을 수 있어 전파하지 않는다(§8.5) — 분류만 남긴다.
 */
function toProviderError(error: unknown): EmbeddingProviderError {
  if (error instanceof EmbeddingProviderError) return error;
  const name = error instanceof Error ? error.name : "unknown";
  return new EmbeddingProviderError(name === "Error" ? "provider_error" : name);
}

/** 단건 임베딩 — 원시 벡터(정규화 전). 정규화는 `embed.ts` 가 담당한다. */
export async function embedOne(
  text: string,
  task: EmbedTask,
  signal?: AbortSignal,
): Promise<number[]> {
  const provider = googleProvider();
  try {
    const { embedding } = await embed({
      model: provider.embedding(getEmbeddingModel()),
      value: text,
      providerOptions: embeddingOptions(task),
      abortSignal: signal,
    });
    return embedding;
  } catch (error) {
    throw toProviderError(error);
  }
}

/** 배치 임베딩 — 다건을 한 번에(비용·지연 절감, 설계 §3.3). 입력 순서와 출력 순서가 일치한다. */
export async function embedBatch(
  texts: string[],
  task: EmbedTask,
  signal?: AbortSignal,
): Promise<number[][]> {
  if (texts.length === 0) return [];
  const provider = googleProvider();

  let embeddings: number[][];
  try {
    ({ embeddings } = await embedMany({
      model: provider.embedding(getEmbeddingModel()),
      values: texts,
      providerOptions: embeddingOptions(task),
      abortSignal: signal,
    }));
  } catch (error) {
    throw toProviderError(error);
  }

  if (embeddings.length !== texts.length) {
    // 순서 매핑이 깨지면 엉뚱한 장소에 벡터가 붙는다 — 조용히 넘기지 않는다.
    throw new EmbeddingProviderError("count_mismatch");
  }
  return embeddings;
}
