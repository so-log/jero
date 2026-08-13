import { afterEach, describe, expect, it, vi } from "vitest";

import {
  formatResetTime,
  nextResetAt,
  remainingLabel,
} from "./usage";

/**
 * 사용량 표시 (설계 §6.4, 기획 §6). 순수 함수라 시각을 주입해 결정적으로 검증한다.
 * 카운터는 **UTC 날짜** 기준이라(계약 C6) 리셋도 UTC 자정이다.
 */

describe("nextResetAt", () => {
  it("다음 UTC 자정을 가리킨다", () => {
    const now = new Date("2026-08-13T05:30:00Z");
    expect(nextResetAt(now).toISOString()).toBe("2026-08-14T00:00:00.000Z");
  });

  it("UTC 자정 직전이어도 그날의 다음 자정이다", () => {
    const now = new Date("2026-08-13T23:59:59Z");
    expect(nextResetAt(now).toISOString()).toBe("2026-08-14T00:00:00.000Z");
  });

  it("월·연 경계를 넘긴다", () => {
    expect(nextResetAt(new Date("2026-12-31T10:00:00Z")).toISOString()).toBe(
      "2027-01-01T00:00:00.000Z",
    );
  });
});

describe("formatResetTime", () => {
  /*
   * ★ 이 블록은 **환경에 의존하지 않아야 한다**.
   *   과거 구현은 `toLocaleTimeString("ko-KR")` 이라 두 가지에 끌려다녔다:
   *     ① 러너의 TZ (CI 는 UTC → 로컬 KST 와 다른 시각)
   *     ② ICU 로케일 데이터 (축소 빌드는 ko 가 없어 조용히 영어로 폴백 → "AM")
   *   지금은 타임존을 인자로 받고 문구를 직접 조립하므로 둘 다 영향이 없다.
   */
  const NOON_UTC = new Date("2026-08-13T05:30:00Z"); // 리셋 = 2026-08-14T00:00Z

  it("Asia/Seoul(UTC+9) 이면 오전 9:00", () => {
    expect(formatResetTime(NOON_UTC, "Asia/Seoul")).toBe("오전 9:00");
  });

  it("UTC 면 오전 12:00(자정)", () => {
    expect(formatResetTime(NOON_UTC, "UTC")).toBe("오전 12:00");
  });

  it("America/New_York(UTC-4, 서머타임) 이면 전날 오후 8:00", () => {
    expect(formatResetTime(NOON_UTC, "America/New_York")).toBe("오후 8:00");
  });

  it("Asia/Kathmandu(UTC+5:45) 처럼 분 단위 오프셋도 정확하다", () => {
    expect(formatResetTime(NOON_UTC, "Asia/Kathmandu")).toBe("오전 5:45");
  });

  it("★ 어떤 타임존에서도 영어 표기가 섞이지 않는다(ICU 로케일 데이터 무관)", () => {
    for (const tz of ["UTC", "Asia/Seoul", "America/New_York", "Europe/London"]) {
      const label = formatResetTime(NOON_UTC, tz);
      expect(label).not.toMatch(/AM|PM/);
      expect(label).toMatch(/^(오전|오후) \d{1,2}:\d{2}$/);
    }
  });

  it("정오·자정 경계를 12시간제로 바르게 적는다", () => {
    // 리셋이 대상 타임존에서 정오가 되는 지점: UTC+12.
    expect(formatResetTime(NOON_UTC, "Pacific/Auckland")).toBe("오후 12:00");
  });

  it("잘못된 타임존이 들어와도 던지지 않고 UTC 로 떨어진다", () => {
    expect(() => formatResetTime(NOON_UTC, "Not/AZone")).not.toThrow();
    expect(formatResetTime(NOON_UTC, "Not/AZone")).toBe("오전 12:00");
  });

  it("타임존을 생략하면 실행 환경 기준으로 형식만 지킨다", () => {
    expect(formatResetTime(NOON_UTC)).toMatch(/^(오전|오후) \d{1,2}:\d{2}$/);
  });
});

describe("formatResetTime — 로케일 데이터 비의존 (CI 회귀)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("★ Intl 은 오직 en-US 로만 호출한다 — ko 데이터가 없는 ICU 빌드에서도 안전하다", () => {
    const Original = Intl.DateTimeFormat;
    const locales: unknown[] = [];
    // new 로 불리므로 화살표 함수는 쓸 수 없다(생성자가 아니다).
    vi.spyOn(Intl, "DateTimeFormat").mockImplementation(function (
      locale?: unknown,
      options?: Intl.DateTimeFormatOptions,
    ) {
      locales.push(locale);
      return new Original(locale as string | undefined, options);
    } as unknown as typeof Intl.DateTimeFormat);

    expect(formatResetTime(new Date("2026-08-13T05:30:00Z"), "Asia/Seoul")).toBe(
      "오전 9:00",
    );

    // 숫자만 뽑는 용도라 en-US 고정 — 표시 문구는 소스의 한국어 리터럴에서 나온다.
    expect(locales.length).toBeGreaterThan(0);
    expect(locales.every((l) => l === "en-US")).toBe(true);
  });
});

describe("remainingLabel", () => {
  it("남은 횟수를 캡션으로 만든다", () => {
    expect(remainingLabel({ remaining: 12, limit: 30 })).toBe("오늘 12회 남음");
  });

  it("아직 응답을 못 받았으면(null) 아무것도 표시하지 않는다", () => {
    expect(remainingLabel(null)).toBe("");
  });

  it("다 썼으면 캡션 대신 소진 안내가 뜨도록 빈 문자열", () => {
    expect(remainingLabel({ remaining: 0, limit: 30 })).toBe("");
  });
});
