"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { FX_RATES } from "@/lib/constants/fx";
import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/env";
import { useOverlayStore } from "@/store/overlayStore";

import type { ExpenseForm } from "../lib/expenseSchema";

/** 여행 현지 기준 ISO 날짜에 n일 더한다(타임존 영향 없이). */
function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/**
 * 지출 추가(오버레이 ③) + 정산 완료(07). 계약 B5. env 가드로 키 없으면 스텁.
 * 무효화 키 ['budget', tripId] 유지 → 닫으면 지표·차트·정산 재계산(설계 §5).
 */
export function useExpenseActions(tripId: string) {
  const open = useOverlayStore((s) => s.open);
  const queryClient = useQueryClient();

  const settle = useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!hasSupabase) return;
      const { error } = await createClient()
        .from("trip")
        .update({ settled_at: new Date().toISOString() })
        .eq("id", tripId);
      if (error) throw new Error("정산 완료 처리에 실패했어요.");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["budget", tripId] });
    },
  });

  return {
    openAddExpense: () => open("expense"),
    /** 정산 완료 — trip.settled_at 갱신(owner, RLS). */
    markSettled: () => settle.mutate(),
  };
}

/**
 * 지출 저장 seam(오버레이 ③) — expense insert + expense_split 작성. 계약 §7.
 * `fx_rate` 는 입력이 아니라 **생성 시 FX_RATES(base=KRW) 스냅샷**으로 저장(이후 환율 변동 무관),
 * `amount_base` 는 생성 칼럼(amount*fx_rate). day(1-based)는 trip.start_date 기준 spent_on 으로 변환.
 * 무효화 키 ['budget', tripId]. 편집 권한은 서버 RLS(editor+)가 강제(§8.2).
 */
export function useUpsertExpense(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation<ExpenseForm, Error, ExpenseForm>({
    mutationFn: async (input) => {
      if (!hasSupabase) return input;
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const tripRes = await supabase
        .from("trip")
        .select("start_date")
        .eq("id", tripId)
        .limit(1)
        .returns<{ start_date: string }[]>();
      const start = tripRes.data?.[0]?.start_date;
      if (tripRes.error || !start) throw new Error("여행 정보를 찾을 수 없어요.");

      const insRes = await supabase
        .from("expense")
        .insert({
          trip_id: tripId,
          title: input.title,
          category: input.category,
          amount: input.amount,
          currency: input.currency,
          fx_rate: FX_RATES[input.currency],
          payer_id: input.payerId,
          spent_on: addDays(start, input.day - 1),
          created_by: user?.id ?? input.payerId,
        })
        .select("id")
        .limit(1)
        .returns<{ id: string }[]>();
      const expenseId = insRes.data?.[0]?.id;
      if (insRes.error || !expenseId) {
        throw new Error("지출을 추가하지 못했어요.");
      }

      if (input.split.length > 0) {
        const { error: splitErr } = await supabase
          .from("expense_split")
          .insert(input.split.map((uid) => ({ expense_id: expenseId, user_id: uid })));
        if (splitErr) throw new Error("분담 정보를 저장하지 못했어요.");
      }
      return input;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["budget", tripId] });
    },
  });
}
