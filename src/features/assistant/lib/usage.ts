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
 * 여기서는 절대 시각(UTC)만 계산하고, 사용자 시간대로 바꿔 적는 일은 `formatResetTime` 이 한다.
 */
export function nextResetAt(now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
}

/**
 * 실행 환경의 IANA 타임존. 못 구하면 UTC 로 떨어진다(표시가 깨지는 것보다 낫다).
 */
function runtimeTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * 주어진 시각을 **대상 타임존의 시·분**으로 환산한다.
 *
 * ★ 로케일은 `en-US` 로 고정한다 — 여기서 뽑는 것은 **숫자뿐**이고, `en-US` 는 축소 ICU
 *   빌드(`small-icu`)에도 항상 들어 있다. 표시 언어와는 무관하다.
 *   (`ko-KR` 을 쓰면 로케일 데이터가 없는 환경에서 조용히 en-US 로 폴백한다.)
 */
function hourMinuteIn(date: Date, timeZone: string): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);

  const value = (type: "hour" | "minute"): number =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");

  // hour12:false 에서 자정을 '24' 로 내는 구현이 있어 정규화한다.
  return { hour: value("hour") % 24, minute: value("minute") };
}

/** 유효하지 않은 타임존이면 `Intl` 이 RangeError 를 던진다 — 표시 때문에 화면이 죽지 않게 막는다. */
function safeTimeZone(timeZone: string): string {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return timeZone;
  } catch {
    return "UTC";
  }
}

/**
 * "오전 9:00" 처럼 **사용자의 시간대**로 리셋 시각을 적는다.
 * 한국(UTC+9)에서는 UTC 자정 = 오전 9시라 "왜 자정이 아닌가"가 자연스럽게 설명된다.
 *
 * ★ 문구는 런타임 로케일 데이터에 맡기지 않고 **직접 조립**한다.
 *   `toLocaleTimeString("ko-KR")` 은 ko 데이터가 없는 환경(CI 의 축소 ICU)에서 말없이
 *   영어로 폴백해 한국어 문장에 "AM" 이 섞였다. 같은 이유로 이 저장소의 다른 시각 포맷터
 *   (`formatLastLogin`·`formatTransferTime`)도 전부 수동 조립이다 — 그 관례를 따른다.
 *
 * @param timeZone 표시 기준 **IANA 타임존**(예: `'Asia/Seoul'`). 로케일 문자열이 아니다.
 *                 기본값은 실행 환경의 타임존이고, 테스트는 명시해 결정적으로 만든다.
 */
export function formatResetTime(
  now: Date,
  timeZone: string = runtimeTimeZone(),
): string {
  const { hour, minute } = hourMinuteIn(nextResetAt(now), safeTimeZone(timeZone));
  const period = hour < 12 ? "오전" : "오후";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${period} ${hour12}:${String(minute).padStart(2, "0")}`;
}

/** 남은 횟수 캡션. 다 썼으면 빈 문자열(소진 안내가 대신 뜬다). */
export function remainingLabel(usage: AssistantUsage | null): string {
  if (!usage || usage.remaining <= 0) return "";
  return `오늘 ${usage.remaining}회 남음`;
}
