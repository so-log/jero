/**
 * 사용량 표시 보조 (설계 §6.4, 기획 18 §6) — **순수 함수**.
 *
 * 한도 판정은 전적으로 서버가 한다(`consume_assistant_quota`, 원자적). 여기 있는 것은
 * **표시용 계산**뿐이라, 값을 조작해도 실제 호출 수는 늘어나지 않는다.
 */

/** 서버가 헤더/본문으로 내려주는 사용량 상태. */
export interface AssistantUsage {
  /** 남은 호출 수. */
  remaining: number;
  /** 일일 한도(표시용 — "N/N" 문구에 쓴다). */
  limit: number;
}

/**
 * 다음 리셋 시각 — 카운터는 **UTC 날짜(`usage_date`) 기준**이라 UTC 자정에 초기화된다(계약 C6).
 * 사용자에게는 자기 시간대로 보여야 하므로 Date 로 변환만 하고 표기는 호출부에서 로케일에 맡긴다.
 */
export function nextResetAt(now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
}

/**
 * "오전 9:00" 처럼 **사용자의 시간대**로 리셋 시각을 적는다.
 * 한국(UTC+9)에서는 UTC 자정 = 오전 9시라 "왜 자정이 아닌가"가 자연스럽게 설명된다.
 *
 * 로케일은 앱 표기 언어(`<html lang="ko">`)에 맞춰 `ko-KR` 로 고정한다 — 브라우저 로케일에
 * 맡기면 한국어 문장 안에 "9:00 AM" 이 섞인다(코드베이스 통화·숫자 표기와 같은 관례).
 * 시간대는 고정하지 않는다: 실행 환경의 시간대가 그대로 반영돼야 사용자에게 맞는 시각이 된다.
 */
export function formatResetTime(now: Date, locale = "ko-KR"): string {
  return nextResetAt(now).toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** 한도 소진 안내 문구(기획 §6 — "오늘 사용량을 다 썼어요(N/N)" + 리셋 시각). */
export function exhaustedMessage(usage: AssistantUsage, now: Date): string {
  return `오늘 사용량을 다 썼어요(${usage.limit}/${usage.limit}). ${formatResetTime(now)}에 다시 채워져요.`;
}

/** 남은 횟수 캡션. 다 썼으면 빈 문자열(소진 안내가 대신 뜬다). */
export function remainingLabel(usage: AssistantUsage | null): string {
  if (!usage || usage.remaining <= 0) return "";
  return `오늘 ${usage.remaining}회 남음`;
}
