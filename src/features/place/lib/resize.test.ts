import { describe, expect, it } from "vitest";

import { clampMapWidth, MAP_MIN_WIDTH, MAP_RESERVED_LEFT } from "./resize";

describe("clampMapWidth (지도 패널 리사이즈)", () => {
  // 예약 좌측폭 = 236 + 8 + 344 = 588. 컨테이너 1000 → 상한 412.
  const container = 1000;
  const maxAt1000 = container - MAP_RESERVED_LEFT; // 412

  it("범위 내 값은 반올림해 그대로 둔다", () => {
    expect(clampMapWidth(400.4, container)).toBe(400);
  });

  it("최소(320) 아래는 320으로 클램프", () => {
    expect(clampMapWidth(100, container)).toBe(MAP_MIN_WIDTH);
  });

  it("리스트 최소폭을 남기는 상한으로 클램프(더 넓게 못 함)", () => {
    expect(clampMapWidth(900, container)).toBe(maxAt1000);
    // 상한만큼일 때 리스트에 최소폭이 남는다.
    expect(container - maxAt1000).toBeGreaterThanOrEqual(MAP_RESERVED_LEFT);
  });

  it("컨테이너가 좁아 상한<min 이어도 min 을 보장", () => {
    expect(clampMapWidth(500, 700)).toBe(MAP_MIN_WIDTH);
  });

  it("컨테이너 미측정(0)이면 min 만 보장(상한 없음)", () => {
    expect(clampMapWidth(1200, 0)).toBe(1200);
    expect(clampMapWidth(100, 0)).toBe(MAP_MIN_WIDTH);
  });

  it("비정상 값(NaN)은 min 으로", () => {
    expect(clampMapWidth(Number.NaN, container)).toBe(MAP_MIN_WIDTH);
  });
});
