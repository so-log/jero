import { describe, expect, it } from "vitest";

import { haversineKm, type Coord } from "@/lib/geo";

import { buildCostMatrix, routeCost } from "./costMatrix";

/** 동선 최적화 1단계 — 비용 매트릭스(Haversine) 대칭·자기0·총비용 합. */
const SEOUL: Coord = { lat: 37.5665, lng: 126.978 };
const BUSAN: Coord = { lat: 35.1796, lng: 129.0756 };
const INCHEON: Coord = { lat: 37.4563, lng: 126.7052 };

describe("buildCostMatrix", () => {
  it("자기자신은 0, 대칭(cost[i][j] === cost[j][i])", () => {
    const cost = buildCostMatrix([SEOUL, BUSAN, INCHEON]);
    expect(cost).toHaveLength(3);
    for (let i = 0; i < 3; i++) {
      expect(cost[i][i]).toBe(0);
      for (let j = 0; j < 3; j++) {
        expect(cost[i][j]).toBeCloseTo(cost[j][i], 10);
      }
    }
  });

  it("셀 값은 두 좌표 Haversine 거리와 일치", () => {
    const cost = buildCostMatrix([SEOUL, BUSAN]);
    expect(cost[0][1]).toBeCloseTo(haversineKm(SEOUL, BUSAN), 10);
    // 서울-부산 직선 ≈ 325km 근방
    expect(cost[0][1]).toBeGreaterThan(300);
    expect(cost[0][1]).toBeLessThan(340);
  });

  it("빈 입력 → 빈 매트릭스", () => {
    expect(buildCostMatrix([])).toEqual([]);
  });
});

describe("routeCost", () => {
  it("연속 간선 합(open path)", () => {
    const cost = [
      [0, 2, 9],
      [2, 0, 5],
      [9, 5, 0],
    ];
    // 0→1→2 = 2 + 5 = 7
    expect(routeCost(cost, [0, 1, 2])).toBe(7);
    // 단일/빈 경로는 0
    expect(routeCost(cost, [0])).toBe(0);
    expect(routeCost(cost, [])).toBe(0);
  });
});
