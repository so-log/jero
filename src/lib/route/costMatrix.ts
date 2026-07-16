/**
 * 동선 최적화 — 비용 매트릭스(설계 §2.1). 순수 함수, 부수효과 없음.
 * n개 좌표 간 이동 비용 cost[i][j]. 기본은 Haversine 직선거리(무료·오프라인).
 * Google 실이동시간(DistanceMatrix)은 다음 단계에서 이 매트릭스를 채우는 대체 소스로 붙는다.
 */
import { haversineKm, type Coord } from "@/lib/geo";

/**
 * n×n 대칭 비용 매트릭스(km). 대각(자기자신)은 0, cost[i][j] === cost[j][i].
 * @param coords 최적화 대상 좌표(순서 = 인덱스). 빈 배열이면 [] 반환.
 */
export function buildCostMatrix(coords: readonly Coord[]): number[][] {
  const n = coords.length;
  const cost: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = haversineKm(coords[i], coords[j]);
      cost[i][j] = d;
      cost[j][i] = d; // 대칭
    }
  }
  return cost;
}

/** 주어진 방문 순서(인덱스 배열)의 총 이동 비용 합. open path(마지막→처음 복귀 없음). */
export function routeCost(cost: number[][], order: readonly number[]): number {
  let sum = 0;
  for (let i = 1; i < order.length; i++) {
    sum += cost[order[i - 1]][order[i]];
  }
  return sum;
}
