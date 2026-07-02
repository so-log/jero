import { describe, expect, it } from "vitest";

import { expenseSchema, type ExpenseForm } from "./expenseSchema";

/** 10 지출 폼 — 금액>0·분담≥1·통화 KRW/JPY. (B) fx_rate 는 입력 스키마에 없다. */
const base: ExpenseForm = {
  title: "긴자 식스 쇼핑",
  amount: 152000,
  currency: "KRW",
  category: "shopping",
  payerId: "m1",
  split: ["m1", "m2"],
  day: 1,
};

describe("expenseSchema", () => {
  it("유효 입력 통과", () => {
    expect(expenseSchema.safeParse(base).success).toBe(true);
  });
  it("금액 0 이하 → 실패", () => {
    expect(expenseSchema.safeParse({ ...base, amount: 0 }).success).toBe(false);
  });
  it("분담 인원 0 → 실패", () => {
    const r = expenseSchema.safeParse({ ...base, split: [] });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("split"))).toBe(true);
    }
  });
  it("통화는 KRW/JPY 만(USD 거부)", () => {
    expect(expenseSchema.safeParse({ ...base, currency: "USD" }).success).toBe(false);
    expect(expenseSchema.safeParse({ ...base, currency: "JPY" }).success).toBe(true);
  });
  it("(B) fx_rate 는 입력에 없음 — 들어와도 결과에서 제거", () => {
    const r = expenseSchema.safeParse({ ...base, fx_rate: 9 });
    expect(r.success).toBe(true);
    if (r.success) expect("fx_rate" in r.data).toBe(false);
  });
});
