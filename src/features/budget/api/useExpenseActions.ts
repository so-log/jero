"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useOverlayStore } from "@/store/overlayStore";

import type { ExpenseForm } from "../lib/expenseSchema";

/**
 * 지출 추가/정산 동작(07·오버레이 ③). "지출 추가"는 오버레이를 연다(overlayStore).
 */
export function useExpenseActions() {
  const open = useOverlayStore((s) => s.open);
  return {
    openAddExpense: () => open("expense"),
    markSettled: () => {
      // TODO(supabase): settled_at 갱신 뮤테이션 → invalidate(['budget', tripId]).
    },
  };
}

/**
 * 지출 저장 seam(오버레이 ③). 현재 **스텁** — 폼·검증·낙관 UI 까지.
 * 무효화 키 ['budget', tripId] 는 07 쿼리와 일치 → 닫으면 지표·차트·정산 재계산(설계 §5).
 *
 * TODO(supabase): expense insert(amount·currency 입력 시 fx_rate 스냅샷 저장, amount_base=amount*fx_rate, §7)
 *   → invalidate(['budget', tripId]). 금액·정산은 서버 권위(§8.3).
 */
export function useUpsertExpense(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation<ExpenseForm, Error, ExpenseForm>({
    mutationFn: (input) => Promise.resolve(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["budget", tripId] });
    },
  });
}
