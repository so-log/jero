"use client";

import { useEffect, useRef } from "react";

/**
 * 임베딩 인덱싱 트리거 (설계 §3.3·§9, 계약 C5).
 *
 * 라우트(`POST /api/assistant/index`)와 RPC 는 phase 1 에서 이미 구현·검증됐지만 **부르는 쪽이 없어서**
 * `place_embedding` 이 비어 있었다. 그 결과 `match_place_embeddings` 가 항상 0행이라 RAG 유사 검색이
 * 실사용에서 근거로 쓰이지 않았다(설계 §7 폴백 경로라 어시스턴트는 정상 동작했다). 이 훅이 그 배선이다.
 *
 * 설계 §3.3 의 "여행 최초 진입 시 미인덱싱 place 를 배치 임베딩" 경로를 택했다:
 * 서버가 `stale_place_embeddings` 로 **`content_hash` 가 바뀐 행만** 돌려주므로, 재진입 비용은
 * "변경 없음 → 0행 → 임베딩 API 호출 없음"으로 사실상 0이다.
 *
 * ★ **fire-and-forget** — 실패는 전부 삼킨다(설계 §3.3 "실패 허용"). 인덱싱이 안 되면 RAG 근거가
 *   줄어들 뿐이고, 워크스페이스 화면은 이 훅의 성패와 무관하게 그대로 떠야 한다.
 * ★ 어시스턴트가 **비활성이면 요청 자체를 보내지 않는다** — 기존 화면 회귀 0(§7 폴백 매트릭스).
 */

/** 한 번의 진입에서 이어서 호출할 최대 횟수. 라우트가 요청당 최대 50곳을 처리한다(=최대 150곳). */
export const MAX_INDEX_ROUNDS = 3;

/** 한 번 호출 → 남은 게 더 있는지. 실패는 "더 없음"으로 취급해 루프를 멈춘다. */
async function indexOnce(tripId: string, signal: AbortSignal): Promise<boolean> {
  const response = await fetch("/api/assistant/index", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tripId }),
    signal,
  });
  if (!response.ok) return false;
  const data: unknown = await response.json();
  return (data as { hasMore?: unknown })?.hasMore === true;
}

/**
 * 워크스페이스 진입 시 1회 인덱싱을 걸어둔다.
 *
 * @param tripId 대상 여행. 비어 있으면 아무것도 하지 않는다.
 * @param enabled 어시스턴트 활성 여부(서버 판정). false 면 호출하지 않는다.
 */
export function useIndexPlaces(tripId: string, enabled: boolean): void {
  /** 같은 여행에 대해 이미 시작했는지 — 재렌더마다 다시 쏘지 않게 막는다. */
  const startedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !tripId) return;
    if (startedFor.current === tripId) return;
    startedFor.current = tripId;

    const controller = new AbortController();

    void (async () => {
      try {
        for (let round = 0; round < MAX_INDEX_ROUNDS; round += 1) {
          const hasMore = await indexOnce(tripId, controller.signal);
          if (!hasMore) break;
        }
      } catch {
        // 네트워크·중단 등 — 조용히 넘어간다(§3.3 실패 허용).
      }
    })();

    return () => {
      controller.abort();
      /*
       * ★ 가드도 함께 푼다. StrictMode(개발)는 effect 를 mount→cleanup→mount 로 두 번 돌리는데,
       *   가드를 남겨두면 첫 요청은 abort 되고 두 번째는 "이미 시작함"으로 건너뛰어
       *   **개발 환경에서만 인덱싱이 영영 안 되는** 상태가 된다.
       */
      startedFor.current = null;
    };
  }, [tripId, enabled]);
}
