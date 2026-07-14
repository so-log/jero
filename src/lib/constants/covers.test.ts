import { describe, expect, it } from "vitest";

import { COVER, coverGradient, isCoverPreset } from "./covers";

/**
 * 커버 그라데이션 resolver(F3) — 프리셋 키·hex·잘못된 값 모두 크래시 없이 그라데이션 문자열을 반환한다.
 * 렌더 지점(TripCard·헤더·프리뷰)이 이 함수만 경유하므로 임의 hex 저장 시 COVER[undefined] 크래시가 없다.
 */
describe("coverGradient", () => {
  it("프리셋 키는 고정 그라데이션을 반환한다", () => {
    expect(coverGradient("blue")).toBe(COVER.blue.gradient);
    expect(coverGradient("amber")).toBe(COVER.amber.gradient);
  });

  it("hex 는 그 색 기반 그라데이션(밝은 2번째 스톱)을 생성한다", () => {
    const g = coverGradient("#FF8800");
    expect(g).toContain("#FF8800");
    expect(g).toContain("color-mix");
    expect(g.startsWith("linear-gradient(")).toBe(true);
  });

  it("3자리 hex 도 허용한다", () => {
    expect(coverGradient("#0af")).toContain("#0af");
  });

  it("프리셋도 hex 도 아닌 값/누락은 기본색(blue)로 폴백한다(크래시 방지)", () => {
    expect(coverGradient("not-a-color")).toBe(COVER.blue.gradient);
    expect(coverGradient("")).toBe(COVER.blue.gradient);
    expect(coverGradient(undefined)).toBe(COVER.blue.gradient);
    expect(coverGradient(null)).toBe(COVER.blue.gradient);
  });

  it("isCoverPreset 은 프리셋 키에만 참", () => {
    expect(isCoverPreset("mint")).toBe(true);
    expect(isCoverPreset("#123456")).toBe(false);
    expect(isCoverPreset(undefined)).toBe(false);
  });
});
