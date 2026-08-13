import { createHash } from "node:crypto";

/**
 * 어시스턴트 운영 로깅 (설계 §6.5) — **서버 전용**.
 *
 * 지금까지 이 경로에는 로그가 아예 없었다. 유출은 없지만 운영 가시성도 없다(어떤 게이트에서
 * 얼마나 막히는지, 응답이 얼마나 걸리는지 알 수 없다). Phase 5 에서 **남겨도 되는 것만** 남긴다.
 *
 * 남기는 것: `trip_id` **해시**·모델명·토큰 수·지연·에러 코드.
 * 남기지 않는 것: **API 키·프롬프트 전문·사용자 메시지·PII**(§6.5, CLAUDE.md §8.5).
 *
 * ★ 타입으로만 막지 않는다 — 아래 `ALLOWED_FIELDS` 로 **직렬화 시점에 화이트리스트 필터**를 건다.
 *   호출부가 실수로(또는 캐스팅으로) 사용자 메시지를 끼워 넣어도 로그에 나가지 않는다.
 *   이것이 "필드가 새지 않는다"를 테스트로 고정할 수 있는 이유다.
 */

/** 로그에 실릴 수 있는 필드 — 이 목록에 없는 키는 **버려진다**. */
const ALLOWED_FIELDS = [
  "event",
  "code",
  "status",
  "tripHash",
  "model",
  "latencyMs",
  "tokens",
  "remaining",
] as const;

type AllowedField = (typeof ALLOWED_FIELDS)[number];

export interface AssistantLogFields {
  /** 무슨 일이 일어났는지. */
  event: "chat_blocked" | "chat_completed" | "chat_failed";
  /** 차단·실패 코드(응답 body 의 `error` 와 동일 어휘). */
  code?: string;
  status?: number;
  /** `hashTripId()` 결과만 넣는다 — 원문 uuid 금지. */
  tripHash?: string;
  model?: string;
  latencyMs?: number;
  tokens?: number;
  /** 잔여 호출 수(운영에서 한도 소진 추이를 보기 위함). */
  remaining?: number;
}

/** 로그 라인 접두사 — 운영에서 필터링하기 쉽게. */
export const LOG_PREFIX = "[assistant]";

/**
 * `trip_id` 단방향 해시(앞 12자). 로그끼리 같은 여행을 묶어 보는 용도라 12자면 충분하고,
 * 원문 uuid 를 되돌릴 수 없다(§6.5 — 로그에 식별자 원문을 남기지 않는다).
 */
export function hashTripId(tripId: string): string {
  return createHash("sha256").update(tripId).digest("hex").slice(0, 12);
}

/**
 * 화이트리스트에 있는 키만, 값이 있는 것만 남긴다.
 * ★ 목록을 **읽는** 방식이라 호출부가 무엇을 더 넣든 구조적으로 빠져나갈 수 없다.
 */
function sanitize(fields: AssistantLogFields): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    const value: AssistantLogFields[AllowedField] = fields[key];
    if (value !== undefined && value !== null) safe[key] = value;
  }
  return safe;
}

/**
 * 한 줄 JSON 으로 남긴다(구조화 로그 수집기가 그대로 파싱한다).
 * 실패해도 요청을 깨뜨리지 않는다 — 로깅은 부가 기능이다.
 */
export function logAssistant(fields: AssistantLogFields): void {
  try {
    // 서버 운영 로그 — 수집기가 stdout 한 줄씩 읽는다.
    console.info(`${LOG_PREFIX} ${JSON.stringify(sanitize(fields))}`);
  } catch {
    // 직렬화 실패는 무시한다.
  }
}
