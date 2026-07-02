import type { CategoryKey } from "@/lib/constants/category";
import type { Currency } from "@/lib/constants/fx";

/**
 * 예산(07) 도메인 타입 — 데이터 계약 §4.6 expense / §5 07 응답 파생.
 * 금액은 원본 통화(amount, currency)로 저장하고, 환산(amount_base=amount*fx_rate)·정산은
 * 순수 셀렉터(lib/budget.ts)가 계산한다(컴포넌트·차트는 결과만 받음).
 */
export interface ExpenseDto {
  id: string;
  /** 'YYYY-MM-DD'. */
  spent_on: string;
  name: string;
  category: CategoryKey;
  /** 결제한 멤버 id. */
  payer_id: string;
  /** 분담(더치페이) 참여 멤버 id 목록 — 균등 N분의 1. */
  split: string[];
  /** 원본 통화 금액. */
  amount: number;
  currency: Currency;
}

/** useBudgetQuery(trip_id) 응답 — 원천 데이터(지표·정산은 셀렉터 계산). */
export interface BudgetResponse {
  /** 기본 통화(집계 기준). MVP=KRW. */
  base_currency: Currency;
  /** 설정 예산(남은 예산·진행 바 기준). */
  total_budget: number;
  expenses: ExpenseDto[];
  /** 정산 완료 시각(ISO) | null. */
  settled_at: string | null;
}
