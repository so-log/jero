"use client";

import { useQuery } from "@tanstack/react-query";

import type { CategoryKey } from "@/lib/constants/category";
import type { Currency } from "@/lib/constants/fx";
import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/env";

import type { BudgetResponse, ExpenseDto } from "../types";
import { BUDGET_FIXTURE } from "./fixtures";

/**
 * useBudgetQuery — 07 지출·예산 원천(설계 §4). 컴포넌트 직접 fetch 금지(§7.1). RLS(멤버)로 내 여행만.
 * 지표·차트·정산은 순수 셀렉터(lib/budget.ts)가 계산(§7.1) — **MVP=클라 셀렉터, 부하 시 서버 RPC 승격**(계약 B5).
 * env 가드로 키 없으면 fixture. 원천만 반환(amount/currency 원본; 환산은 셀렉터).
 */
interface TripBudgetRow {
  base_currency: Currency;
  total_budget: number | null;
  settled_at: string | null;
}
interface ExpenseRow {
  id: string;
  title: string;
  category: CategoryKey;
  amount: number;
  currency: Currency;
  payer_id: string;
  spent_on: string;
  expense_split: { user_id: string }[];
}

export function useBudgetQuery(tripId: string) {
  return useQuery<BudgetResponse>({
    queryKey: ["budget", tripId],
    queryFn: async () => {
      if (!hasSupabase) return BUDGET_FIXTURE;
      const supabase = createClient();

      const [tripRes, expRes] = await Promise.all([
        supabase
          .from("trip")
          .select("base_currency, total_budget, settled_at")
          .eq("id", tripId)
          .limit(1)
          .returns<TripBudgetRow[]>(),
        supabase
          .from("expense")
          .select(
            "id, title, category, amount, currency, payer_id, spent_on, expense_split ( user_id )",
          )
          .eq("trip_id", tripId)
          .order("spent_on")
          .returns<ExpenseRow[]>(),
      ]);

      const t = tripRes.data?.[0];
      if (tripRes.error || !t) throw new Error("예산 정보를 불러오지 못했어요.");
      if (expRes.error) throw new Error("지출을 불러오지 못했어요.");

      const expenses: ExpenseDto[] = (expRes.data ?? []).map((e) => ({
        id: e.id,
        spent_on: e.spent_on,
        name: e.title,
        category: e.category,
        payer_id: e.payer_id,
        split: e.expense_split.map((s) => s.user_id),
        amount: Number(e.amount),
        currency: e.currency,
      }));

      return {
        base_currency: t.base_currency,
        total_budget: Number(t.total_budget ?? 0),
        expenses,
        settled_at: t.settled_at,
      };
    },
  });
}
