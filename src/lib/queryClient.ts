import { QueryClient } from "@tanstack/react-query";

/**
 * TanStack Query 클라이언트 — 서버상태 단일 출처(설계 §4).
 * 컴포넌트 직접 fetch 금지(§7.1): 데이터는 features/<도메인>/api 의 쿼리/뮤테이션 경유.
 */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}
