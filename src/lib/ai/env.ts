/**
 * AI 어시스턴트 환경 (설계 §6.1). **전부 서버 전용** — `NEXT_PUBLIC_` 접두 금지(§8.1).
 *
 * 키가 없으면 `assistantEnabled=false` → 라우트가 비활성(503)되고 Phase 2 의 FAB 도 뜨지 않는다.
 * 기존 화면·테스트는 이 플래그와 무관하게 그대로 동작한다(회귀 0).
 *
 * 노출 방어 3중:
 *  ① `NEXT_PUBLIC_` 을 안 붙였으므로 Next 가 클라 번들에 값을 주입하지 않는다(빈 문자열이 된다).
 *  ② 아래 `assertServer()` 로 브라우저에서 import 되면 즉시 throw — 실수로 컴포넌트가 끌어오면 바로 드러난다.
 *  ③ 이 모듈은 라우트 핸들러(`app/api/assistant/**`)에서만 import 한다.
 *
 * NOTE: `server-only` 패키지를 쓰면 빌드 타임에 잡히지만 의존성 추가가 필요해 런타임 가드로 대체했다.
 */
function assertServer(): void {
  if (typeof window !== "undefined") {
    throw new Error("lib/ai/env 는 서버 전용입니다 — 클라이언트에서 import 금지.");
  }
}

/** Gemini 키 — 채팅·임베딩 공용(provider 통일, 계약 C2). */
export function getGeminiApiKey(): string {
  assertServer();
  return process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "";
}

/** 임베딩 모델 ID. 교체 시 전체 재인덱싱 필요(계약 C2). */
export function getEmbeddingModel(): string {
  assertServer();
  return process.env.EMBEDDING_MODEL ?? "gemini-embedding-001";
}

/**
 * 채팅 모델 ID — 무료 티어 flash 급(설계 §1). 쿼터·모델 정책 변동 시 env 로 교체.
 *
 * ★ 기본값이 별칭(`-latest`)인 이유: 실제 키로 확인해보니 `gemini-2.5-flash`·`gemini-2.0-flash` 는
 *   "no longer available to new users"(404)로 거절됐고 별칭만 응답했다. 구글이 세대를 정리해도
 *   별칭은 살아 있는 모델을 가리키므로, 고정 버전보다 무료 티어 변동에 강하다.
 *   특정 버전을 고정하고 싶으면 `AI_MODEL` 로 지정한다.
 */
export function getChatModel(): string {
  assertServer();
  return process.env.AI_MODEL ?? "gemini-flash-latest";
}

/** 대화 컨텍스트로 보낼 최근 턴 수 상한(설계 §3.4 — 비용·지연 관리). */
export const MAX_HISTORY_TURNS = 8;

/** 사용자 메시지 1건의 최대 길이(설계 §6.3 입력 검증). */
export const MAX_MESSAGE_CHARS = 2000;

/** 임베딩 차원 — pgvector 컬럼 `vector(768)` 과 반드시 일치(계약 C2). */
export const EMBEDDING_DIM = 768;

/** 일일 요청 한도(계약 C6). `consume_assistant_quota` 인자로만 쓰인다 — 클라 입력 아님. */
export function getAssistantDailyLimit(): number {
  assertServer();
  const parsed = Number.parseInt(process.env.ASSISTANT_DAILY_LIMIT ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
}

/**
 * feature flag. 키가 있어야 켜지고, `ASSISTANT_ENABLED=false` 로 명시적 차단도 가능하다.
 * 키 존재 여부 자체는 클라에 내려보내지 않는다 — boolean 만 노출(§6.1).
 */
export function isAssistantEnabled(): boolean {
  assertServer();
  return (
    process.env.ASSISTANT_ENABLED !== "false" &&
    getGeminiApiKey().length > 0
  );
}
