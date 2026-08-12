"use client";

import { useQuery } from "@tanstack/react-query";

/**
 * 어시스턴트 사용 가능 여부 (설계 §6.1). 서버가 판정한 **boolean 만** 받는다.
 * 컴포넌트 직접 fetch 금지(§7.1) — 이 훅을 경유한다.
 *
 * 실패하면 `false` 로 간주해 FAB 을 감춘다(열어놓고 깨지는 것보다 안 보이는 편이 낫다).
 */
export function useAssistantStatus() {
  return useQuery({
    queryKey: ["assistant", "status"],
    queryFn: async (): Promise<boolean> => {
      const response = await fetch("/api/assistant/status");
      if (!response.ok) return false;
      const data: unknown = await response.json();
      return (
        typeof data === "object" &&
        data !== null &&
        (data as { enabled?: unknown }).enabled === true
      );
    },
    // 배포 중 바뀌지 않는 값 — 세션 동안 한 번만 조회한다.
    staleTime: Infinity,
    retry: false,
  });
}
