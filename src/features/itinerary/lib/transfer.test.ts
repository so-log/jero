import { describe, expect, it } from "vitest";

import { TRANSFER_MODES, formatTransferTime, transferMode } from "./transfer";

describe("transferMode", () => {
  it("모드 → 라벨·아이콘", () => {
    expect(transferMode("train")).toMatchObject({ label: "기차", icon: "train" });
    expect(transferMode("flight")).toMatchObject({ label: "항공", icon: "plane" });
    expect(transferMode("bus").icon).toBe("bus");
  });

  it("null/미등록 → '이동' 폴백", () => {
    expect(transferMode(null).value).toBe("etc");
    expect(transferMode(undefined).label).toBe("이동");
  });

  it("모든 모드가 등록된 아이콘 이름을 쓴다", () => {
    // icons.ts union 은 컴파일 타임 보장 — 값 존재만 확인.
    expect(TRANSFER_MODES.every((m) => m.icon.length > 0)).toBe(true);
  });
});

describe("formatTransferTime", () => {
  it("'HH:MM' → 오전/오후 표기", () => {
    expect(formatTransferTime("09:30")).toBe("오전 9:30");
    expect(formatTransferTime("14:05")).toBe("오후 2:05");
    expect(formatTransferTime("00:00")).toBe("오전 12:00");
    expect(formatTransferTime("12:00")).toBe("오후 12:00");
  });

  it("빈값/이상값 → null", () => {
    expect(formatTransferTime(null)).toBeNull();
    expect(formatTransferTime("")).toBeNull();
    expect(formatTransferTime("bad")).toBeNull();
  });
});
