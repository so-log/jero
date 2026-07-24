import { describe, expect, it } from "vitest";

import { formatLastLogin } from "./format";

describe("formatLastLogin", () => {
  it("ISO → 'YYYY.M.D 오전/오후 h:mm'", () => {
    // 로컬 타임존 의존을 피하려 로컬 시각 문자열로 생성.
    const morning = new Date(2026, 5, 23, 9, 12); // 2026-06-23 09:12
    expect(formatLastLogin(morning.toISOString())).toBe("2026.6.23 오전 9:12");
    const afternoon = new Date(2026, 5, 23, 14, 5);
    expect(formatLastLogin(afternoon.toISOString())).toBe("2026.6.23 오후 2:05");
    const noon = new Date(2026, 0, 1, 12, 0);
    expect(formatLastLogin(noon.toISOString())).toBe("2026.1.1 오후 12:00");
    const midnight = new Date(2026, 0, 1, 0, 30);
    expect(formatLastLogin(midnight.toISOString())).toBe("2026.1.1 오전 12:30");
  });

  it("없거나 파싱 실패 → null(표기 숨김)", () => {
    expect(formatLastLogin(null)).toBeNull();
    expect(formatLastLogin(undefined)).toBeNull();
    expect(formatLastLogin("")).toBeNull();
    expect(formatLastLogin("not-a-date")).toBeNull();
  });
});
