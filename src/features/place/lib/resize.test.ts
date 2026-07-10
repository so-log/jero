import { describe, expect, it } from "vitest";

import { clampMapWidth, MAP_MIN_WIDTH } from "./resize";

describe("clampMapWidth (지도 패널 리사이즈)", () => {
  const container = 1000; // max = 700 (0.7)

  it("범위 내 값은 반올림해 그대로 둔다", () => {
    expect(clampMapWidth(500.4, container)).toBe(500);
  });

  it("최소(320) 아래는 320으로 클램프", () => {
    expect(clampMapWidth(100, container)).toBe(MAP_MIN_WIDTH);
  });

  it("최대(컨테이너 70%) 위는 상한으로 클램프", () => {
    expect(clampMapWidth(900, container)).toBe(700);
  });

  it("컨테이너가 좁아 min>max 여도 min 을 보장", () => {
    // container 400 → 0.7=280 < 320 → max=max(320,280)=320
    expect(clampMapWidth(500, 400)).toBe(320);
  });

  it("컨테이너 미측정(0)이면 min 만 보장(상한 없음)", () => {
    expect(clampMapWidth(1200, 0)).toBe(1200);
    expect(clampMapWidth(100, 0)).toBe(MAP_MIN_WIDTH);
  });

  it("비정상 값(NaN)은 min 으로", () => {
    expect(clampMapWidth(Number.NaN, container)).toBe(MAP_MIN_WIDTH);
  });
});
