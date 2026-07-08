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
    /** 기존 지출 편집 — 오버레이를 expense id 로 연다(프리필). */
    openEditExpense: (expenseId: string) => open("expense", { expenseId }),
    /** 정산 완료 — trip.settled_at 갱신(owner, RLS). */
    markSettled: () => settle.mutate(),
  };
}

/** 지출 저장 입력 — id 있으면 편집(update), 없으면 추가(insert). */
export type ExpenseUpsertInput = ExpenseForm & { id?: string };

/**
 * 지출 저장 seam(오버레이 ③) — **id 유무로 insert/update 분기** + expense_split 재작성. 계약 §7·B5.
 * `fx_rate` 는 입력이 아니라 FX_RATES(base=KRW) 스냅샷(생성·편집 시점, 이후 환율 변동 무관),
 * `amount_base` 는 생성 칼럼(amount*fx_rate). day(1-based)는 trip.start_date 기준 spent_on 으로 변환.
 * 편집 시 분담(expense_split)은 delete→insert 로 재작성(인원 변경 반영). 무효화 ['budget', tripId] →
 * 07 지표·차트·**정산 재계산**(정산은 항상 지출에서 라이브 산출 — settled_at 은 owner 전용 마커라 편집이 건드리지 않음).
 * 편집 권한은 서버 RLS(editor+)가 강제(§8.2). 서버 재검증 대상(§8.3).
 */
export function useUpsertExpense(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation<ExpenseUpsertInput, Error, ExpenseUpsertInput>({
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

      const fields = {
        title: input.title,
        category: input.category,
        amount: input.amount,
        currency: input.currency,
        fx_rate: FX_RATES[input.currency],
        payer_id: input.payerId,
        spent_on: addDays(start, input.day - 1),
      };

      let expenseId = input.id;
      if (expenseId) {
        // 편집: 필드 update(trip_id·created_by 는 보존) + 분담 재작성.
        const { error: updErr } = await supabase
          .from("expense")
          .update(fields)
          .eq("id", expenseId);
        if (updErr) throw new Error("지출을 저장하지 못했어요.");
        const { error: delErr } = await supabase
          .from("expense_split")
          .delete()
          .eq("expense_id", expenseId);
        if (delErr) throw new Error("분담 정보를 저장하지 못했어요.");
      } else {
        // 추가: insert 후 id 확보.
        const insRes = await supabase
          .from("expense")
          .insert({ ...fields, trip_id: tripId, created_by: user?.id ?? input.payerId })
          .select("id")
          .limit(1)
          .returns<{ id: string }[]>();
        expenseId = insRes.data?.[0]?.id;
        if (insRes.error || !expenseId) {
          throw new Error("지출을 추가하지 못했어요.");
        }
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
