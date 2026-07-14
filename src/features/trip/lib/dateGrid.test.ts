import { describe, expect, it } from "vitest";

import {
  formatDateInput,
  monthCells,
  parseISO,
  parseUserDate,
  shiftMonth,
  toISO,
} from "./dateGrid";

describe("dateGrid — Step2 캘린더 순수 로직", () => {
  it("toISO / parseISO round-trip (월 0-based)", () => {
    expect(toISO(2026, 3, 5)).toBe("2026-04-05"); // 3=4월
    expect(parseISO("2026-04-05")).toEqual({ y: 2026, m: 3, d: 5 });
    expect(parseISO("bad")).toBeNull();
  });

  it("formatDateInput — 'Y.M.D' 표시", () => {
    expect(formatDateInput("2026-04-05")).toBe("2026.4.5");
    expect(formatDateInput("")).toBe("");
  });

  it("parseUserDate — 다양한 구분자 허용, 실제 존재 날짜만", () => {
    expect(parseUserDate("2026.4.15")).toBe("2026-04-15");
    expect(parseUserDate("2026-4-15")).toBe("2026-04-15");
    expect(parseUserDate("2026/12/1")).toBe("2026-12-01");
    expect(parseUserDate("2026.2.30")).toBeNull(); // 존재하지 않음(롤오버 방지)
    expect(parseUserDate("아무거나")).toBeNull();
  });

  it("shiftMonth — 연 경계 안전", () => {
    expect(shiftMonth({ y: 2026, m: 0 }, -1)).toEqual({ y: 2025, m: 11 });
    expect(shiftMonth({ y: 2026, m: 11 }, 1)).toEqual({ y: 2027, m: 0 });
  });

  it("monthCells — 7의 배수, 해당 월 일수 정확, 첫 inMonth=1일", () => {
    const cells = monthCells(2026, 3); // 2026년 4월(30일)
    expect(cells.length % 7).toBe(0);
    const inMonth = cells.filter((c) => c.inMonth);
    expect(inMonth).toHaveLength(30);
    expect(inMonth[0].n).toBe(1);
    expect(inMonth[0].iso).toBe("2026-04-01");
    expect(inMonth[29].iso).toBe("2026-04-30");
    // 2026-04-01 은 수요일 → 앞에 인접월(3월) 3칸.
    expect(cells[0].inMonth).toBe(false);
  });
});
