import { describe, expect, it } from "vitest";

import type { Coord } from "@/lib/geo";

import { buildCostMatrix } from "./costMatrix";
import { nearestNeighborOrder, optimizeRoute, pathCost } from "./optimize";

/** 동선 최적화 1단계 — NN + 2-opt 순수 알고리즘. */

// 적도 위 경도만 다른 점(거리는 |Δlng| 에 단조) → 기대 순서를 좌표로 고정.
const line = (xs: number[]): Coord[] => xs.map((lng) => ({ lat: 0, lng }));

const isPermutationOf = (order: number[], n: number): boolean => {
  if (order.length !== n) return false;
  return [...order].sort((a, b) => a - b).every((v, i) => v === i);
};

describe("optimizeRoute — 경계", () => {
  it("n<2 는 그대로(identity) 반환", () => {
    expect(optimizeRoute([])).toEqual([]);
    expect(optimizeRoute([[0]])).toEqual([0]);
  });
});

describe("optimizeRoute — 고정 좌표 → 기대 순서", () => {
  it("직선 위 흩어진 점을 방문 순서대로 정렬(NN 시드=최소 인덱스)", () => {
    // 인덱스별 lng: 0→0, 1→3, 2→1, 3→2 → 최적 경로는 lng 오름차순 [0,2,3,1]
    const cost = buildCostMatrix(line([0, 3, 1, 2]));
    expect(optimizeRoute(cost)).toEqual([0, 2, 3, 1]);
  });
});

describe("optimizeRoute — 2-opt 보장(초기해 이하)", () => {
  const sets: Coord[][] = [
    // 2차원 흩뿌린 점들(교차 발생 가능) — lat/lng 조합
    [
      { lat: 0, lng: 0 },
      { lat: 2, lng: 3 },
      { lat: 1, lng: 1 },
      { lat: 3, lng: 0 },
      { lat: 0.5, lng: 2.5 },
      { lat: 2.5, lng: 1.2 },
    ],
    line([0, 5, 2, 8, 1, 6, 3]),
  ];

  it("2-opt 결과 총비용 ≤ NN 초기해 (모든 세트)", () => {
    for (const coords of sets) {
      const cost = buildCostMatrix(coords);
      const nn = nearestNeighborOrder(cost);
      const opt = optimizeRoute(cost);
      expect(isPermutationOf(opt, coords.length)).toBe(true);
      expect(pathCost(cost, opt)).toBeLessThanOrEqual(pathCost(cost, nn) + 1e-9);
    }
  });

  it("무작위 초기 배열(identity)보다 총비용이 작거나 같다", () => {
    const cost = buildCostMatrix(line([0, 5, 2, 8, 1, 6, 3]));
    const identity = cost.map((_, i) => i);
    const opt = optimizeRoute(cost);
    expect(pathCost(cost, opt)).toBeLessThanOrEqual(pathCost(cost, identity));
    // 이 세트는 identity 가 지그재그라 실제로 더 짧아져야 함
    expect(pathCost(cost, opt)).toBeLessThan(pathCost(cost, identity));
  });
});

describe("optimizeRoute — 앵커 고정(설계 §2.3)", () => {
  const cost = buildCostMatrix(line([0, 5, 2, 8, 1, 6, 3]));
  const n = cost.length;

  it("start 고정: 첫 위치가 start, 유효 순열", () => {
    const order = optimizeRoute(cost, { start: 3 });
    expect(order[0]).toBe(3);
    expect(isPermutationOf(order, n)).toBe(true);
  });

  it("end 고정: 마지막 위치가 end, 유효 순열", () => {
    const order = optimizeRoute(cost, { end: 2 });
    expect(order[order.length - 1]).toBe(2);
    expect(isPermutationOf(order, n)).toBe(true);
  });

  it("start·end 동시 고정: 양끝 고정 + 총비용 ≤ 동일 앵커 NN", () => {
    const order = optimizeRoute(cost, { start: 0, end: 6 });
    expect(order[0]).toBe(0);
    expect(order[order.length - 1]).toBe(6);
    expect(isPermutationOf(order, n)).toBe(true);
    const nn = nearestNeighborOrder(cost, { start: 0, end: 6 });
    expect(pathCost(cost, order)).toBeLessThanOrEqual(pathCost(cost, nn) + 1e-9);
  });
});
