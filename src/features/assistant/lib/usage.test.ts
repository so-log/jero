import { describe, expect, it } from "vitest";

import {
  exhaustedMessage,
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
  it("사용자 시간대로 표기한다 — 한국(UTC+9)이면 오전 9시", () => {
    const label = formatResetTime(new Date("2026-08-13T05:30:00Z"), "ko-KR");
    // "오전 9:00" 형태(런타임 로케일 데이터에 따라 구분자만 다를 수 있다).
    expect(label).toMatch(/9:00/);
  });

  it("★ 기본 로케일이 ko-KR — 한국어 문장에 'AM' 이 섞이지 않는다", () => {
    const label = formatResetTime(new Date("2026-08-13T05:30:00Z"));
    expect(label).not.toMatch(/AM|PM/);
  });
});

describe("exhaustedMessage", () => {
  it("★ 한도(N/N)와 리셋 시각을 함께 안내한다(기획 §6)", () => {
    const msg = exhaustedMessage(
      { remaining: 0, limit: 30 },
      new Date("2026-08-13T05:30:00Z"),
    );
    expect(msg).toContain("오늘 사용량을 다 썼어요(30/30)");
    expect(msg).toContain("다시 채워져요");
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
