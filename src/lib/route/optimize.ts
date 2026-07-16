/**
 * 동선 최적화 — Nearest-Neighbor 초기해 + 2-opt 개선(설계 §2.2·§2.3). 순수 함수, 부수효과 없음.
 * open path(마지막→처음 복귀 없음) 기준. 결과 총비용은 항상 NN 초기해 이하(2-opt는 개선만 채택).
 */

/** 앵커: 시작/끝 인덱스 고정(설계 §2.3). 미지정 시 자유. */
export interface RouteAnchors {
  /** 시작으로 고정할 인덱스(경로 첫 위치). */
  start?: number;
  /** 끝으로 고정할 인덱스(경로 마지막 위치). */
  end?: number;
}

// 부동소수 왕복(핑퐁) 방지용 개선 최소폭. 2-opt 반복 상한(대규모 방어, 설계 §8).
const EPS = 1e-9;
const MAX_PASSES = 100;

/** open path 총 비용(연속 간선 합). */
function pathCost(cost: number[][], order: readonly number[]): number {
  let sum = 0;
  for (let i = 1; i < order.length; i++) sum += cost[order[i - 1]][order[i]];
  return sum;
}

/** Nearest-Neighbor 초기해. start 고정(없으면 최소 인덱스 자유노드 시드), end 는 마지막에 append. */
function nearestNeighbor(
  cost: number[][],
  n: number,
  start: number | undefined,
  end: number | undefined,
): number[] {
  const middle: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i !== start && i !== end) middle.push(i);
  }

  const seq: number[] = [];
  let current: number;
  if (start !== undefined) {
    current = start;
  } else {
    // 자유 시작: 결정적으로 최소 인덱스 자유노드를 시드로(위치 0 고정)
    current = middle.shift() as number;
  }
  seq.push(current);

  const remaining = new Set(middle);
  while (remaining.size > 0) {
    let best = -1;
    let bestD = Infinity;
    for (const j of remaining) {
      const d = cost[current][j];
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    }
    seq.push(best);
    remaining.delete(best);
    current = best;
  }

  if (end !== undefined) seq.push(end);
  return seq;
}

/**
 * 2-opt 개선 — 두 간선을 뒤집어(구간 reverse) 총비용이 줄면 채택, 개선 없을 때까지 반복.
 * 앵커 보존: 위치 0(start)은 i>=1 로 불변, end 고정 시 마지막 위치도 불변(k<=len-2).
 */
function twoOpt(cost: number[][], seq: number[], endFixed: boolean): number[] {
  const len = seq.length;
  const route = [...seq];
  let improved = true;
  let passes = 0;

  while (improved && passes < MAX_PASSES) {
    improved = false;
    passes++;
    for (let i = 1; i <= len - 2; i++) {
      const kMax = endFixed ? len - 2 : len - 1;
      for (let k = i + 1; k <= kMax; k++) {
        const a = route[i - 1];
        const b = route[i];
        const c = route[k];
        const hasNext = k + 1 < len;
        const before = cost[a][b] + (hasNext ? cost[c][route[k + 1]] : 0);
        const after = cost[a][c] + (hasNext ? cost[b][route[k + 1]] : 0);
        if (after < before - EPS) {
          // seq[i..k] 뒤집기
          let lo = i;
          let hi = k;
          while (lo < hi) {
            const t = route[lo];
            route[lo] = route[hi];
            route[hi] = t;
            lo++;
            hi--;
          }
          improved = true;
        }
      }
    }
  }
  return route;
}

/**
 * 최적 방문 순서(인덱스 배열)를 반환한다. NN 초기해 → 2-opt 개선.
 * @param cost n×n 비용 매트릭스(대칭 가정, 대각 0).
 * @param opts 앵커(start/end 고정 인덱스).
 * @returns 방문 순서 인덱스 배열. n<2 는 그대로(identity) 반환.
 */
export function optimizeRoute(
  cost: number[][],
  opts: RouteAnchors = {},
): number[] {
  const n = cost.length;
  if (n < 2) return Array.from({ length: n }, (_, i) => i);

  const initial = nearestNeighbor(cost, n, opts.start, opts.end);
  return twoOpt(cost, initial, opts.end !== undefined);
}

/** NN 초기해만(2-opt 전) — 미리보기·검증용. n<2 는 identity. */
export function nearestNeighborOrder(
  cost: number[][],
  opts: RouteAnchors = {},
): number[] {
  const n = cost.length;
  if (n < 2) return Array.from({ length: n }, (_, i) => i);
  return nearestNeighbor(cost, n, opts.start, opts.end);
}

export { pathCost };
