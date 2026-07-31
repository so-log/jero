import { createHash } from "node:crypto";

import { EMBEDDING_DIM, getEmbeddingModel } from "./env";
import {
  embedBatch,
  embedOne,
  EmbeddingProviderError,
  type EmbedTask,
} from "./provider";

/**
 * 임베딩 **단일 진입점** (계약 C2-a). 저장 벡터와 질의 벡터가 같은 전처리를 거치도록 강제한다.
 *
 * 모델·차원·L2 정규화 셋 중 하나라도 어긋나면 유사도가 **에러 없이 조용히 무의미해진다**.
 * 그래서 세 가지를 이 파일 밖에서 지정할 수 없게 막고, task type 만 문서/질의로 분기한다.
 *
 *   저장: RETRIEVAL_DOCUMENT   질의: RETRIEVAL_QUERY   ← 벡터 공간은 공유, 역할만 구분
 */

/** 정규화까지 끝난 임베딩 + 어떤 모델로 만들었는지(교체 감지용). */
export interface EmbeddingResult {
  /** 길이 = EMBEDDING_DIM, L2 노름 = 1. */
  vector: number[];
  /** 생성 모델 ID — `place_embedding.model` 로 저장된다. */
  model: string;
}

/**
 * L2 정규화. Gemini 임베딩은 기본 차원(3072) 이외로 절단하면 단위벡터가 아니므로
 * **반드시** 다시 정규화해야 코사인 비교가 성립한다(계약 C2).
 */
export function l2Normalize(vector: number[]): number[] {
  let sumSquares = 0;
  for (const v of vector) sumSquares += v * v;
  const norm = Math.sqrt(sumSquares);
  // 영벡터는 정규화할 수 없다 — 그대로 두면 NaN 이 퍼지므로 원본을 돌려준다.
  if (norm === 0 || !Number.isFinite(norm)) return [...vector];
  return vector.map((v) => v / norm);
}

/** 차원·수치 유효성 검사. 여기서 막지 않으면 pgvector insert 가 실패하거나 잘못된 값이 들어간다. */
function assertUsable(vector: number[]): void {
  if (vector.length !== EMBEDDING_DIM) {
    throw new EmbeddingProviderError(
      `dim_mismatch_${vector.length}_expected_${EMBEDDING_DIM}`,
    );
  }
  if (vector.some((v) => !Number.isFinite(v))) {
    throw new EmbeddingProviderError("non_finite_value");
  }
}

function finalize(raw: number[]): EmbeddingResult {
  assertUsable(raw);
  return { vector: l2Normalize(raw), model: getEmbeddingModel() };
}

async function embedTexts(
  texts: string[],
  task: EmbedTask,
  signal?: AbortSignal,
): Promise<EmbeddingResult[]> {
  const raw = await embedBatch(texts, task, signal);
  return raw.map(finalize);
}

/** 저장용(장소 문서) 배치 임베딩. 입력 순서 = 출력 순서. */
export function embedDocuments(
  texts: string[],
  signal?: AbortSignal,
): Promise<EmbeddingResult[]> {
  return embedTexts(texts, "RETRIEVAL_DOCUMENT", signal);
}

/** 질의용 단건 임베딩 — Phase 2 챗이 유사 검색 직전에 호출한다. */
export async function embedQuery(
  text: string,
  signal?: AbortSignal,
): Promise<EmbeddingResult> {
  return finalize(await embedOne(text, "RETRIEVAL_QUERY", signal));
}

/**
 * pgvector 리터럴 직렬화 — PostgREST 로 `vector` 파라미터를 넘길 때 쓴다.
 * pgvector 입력 형식은 `[1,2,3]` 이다.
 */
export function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

/**
 * 임베딩 원문 — SQL `place_embed_content()` 의 TS 미러(계약 C2-b, `memo` 제외).
 *
 * ⚠️ **권위는 SQL 쪽**이다(인덱싱·해시 비교 모두 DB 함수가 수행). 이 함수는
 * 미리보기·테스트에서 "무엇이 provider 로 나가는가"를 검증하기 위한 것이며,
 * 정합성은 `embed.test.ts` 가 형식(` · ` 조인, memo 미포함)으로 지킨다.
 */
export function buildEmbedContent(place: {
  name: string;
  category: string;
  area?: string | null;
}): string {
  return [place.name, place.category, place.area?.trim() || null]
    .filter((part): part is string => Boolean(part))
    .join(" · ")
    .trim();
}

/** SQL `md5(place_embed_content(p))` 와 같은 해시(변경 감지 — 계약 C4). */
export function contentHash(content: string): string {
  return createHash("md5").update(content, "utf8").digest("hex");
}
