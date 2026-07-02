import { useQuery } from "@tanstack/react-query";

import type { BudgetResponse } from "../types";
import { BUDGET_FIXTURE } from "./fixtures";

/**
 * useBudgetQuery — 07 지출·예산 원천(설계 §4). 컴포넌트 직접 fetch 금지(§7.1).
 * TODO(supabase): queryFn 을 expense·budget_setting select(RLS)로 교체.
 * 금액·정산은 §8.3 상 서버 권위가 원칙 — 현재는 fixture + 순수 셀렉터(lib/budget.ts)로 계산해 표시.
 */
export function useBudgetQuery(tripId: string) {
  return useQuery<BudgetResponse>({
    queryKey: ["budget", tripId],
    queryFn: () => BUDGET_FIXTURE,
  });
}
