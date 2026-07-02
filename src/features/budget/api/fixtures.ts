import type { BudgetResponse } from "../types";

/**
 * 07 예산 fixture — 원천 지출만 담는다(지표·정산은 lib/budget.ts 셀렉터가 계산).
 * 통화 혼합(JPY 현지 결제 + KRW)으로 환산(FX_RATES, base=KRW)을 검증한다.
 * 멤버 id 는 MEMBERS_FIXTURE(m1~m4)와 동일.
 */
export const BUDGET_FIXTURE: BudgetResponse = {
  base_currency: "KRW",
  total_budget: 1_500_000,
  settled_at: null,
  expenses: [
    { id: "e1", spent_on: "2026-04-18", name: "츠키지 장외시장 스시", category: "food", payer_id: "m2", split: ["m1", "m2", "m3", "m4"], amount: 7600, currency: "JPY" },
    { id: "e2", spent_on: "2026-04-18", name: "스이카 교통패스", category: "transport", payer_id: "m1", split: ["m1", "m2", "m3", "m4"], amount: 24000, currency: "KRW" },
    { id: "e3", spent_on: "2026-04-18", name: "긴자 식스 쇼핑", category: "shopping", payer_id: "m3", split: ["m1", "m3"], amount: 17000, currency: "JPY" },
    { id: "e4", spent_on: "2026-04-18", name: "블루보틀 긴자", category: "cafe", payer_id: "m4", split: ["m1", "m2", "m3", "m4"], amount: 2300, currency: "JPY" },
    { id: "e5", spent_on: "2026-04-19", name: "호텔 2박 숙박비", category: "hotel", payer_id: "m1", split: ["m1", "m2", "m3", "m4"], amount: 46000, currency: "JPY" },
    { id: "e6", spent_on: "2026-04-19", name: "사라베스 브런치", category: "food", payer_id: "m2", split: ["m1", "m2", "m3", "m4"], amount: 6200, currency: "JPY" },
    { id: "e7", spent_on: "2026-04-19", name: "네즈 미술관 입장", category: "museum", payer_id: "m3", split: ["m1", "m2", "m3"], amount: 1300, currency: "JPY" },
    { id: "e8", spent_on: "2026-04-20", name: "나카미세 기념품", category: "gift", payer_id: "m4", split: ["m1", "m2", "m3", "m4"], amount: 4200, currency: "JPY" },
    { id: "e9", spent_on: "2026-04-20", name: "우에노 점심", category: "food", payer_id: "m2", split: ["m1", "m2", "m3", "m4"], amount: 4900, currency: "JPY" },
  ],
};
