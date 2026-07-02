import { describe, expect, it } from "vitest";

import type { ExpenseDto } from "../types";
import {
  budgetMetrics,
  byCategory,
  byDay,
  computeSettlements,
  expenseBase,
  totalSpent,
} from "./budget";

/**
 * 07 예산 순수 셀렉터 — 수용 기준(§11): 환산(amount*fx_rate)·지표·더치페이 정산(송금 최소화).
 */
function exp(p: Partial<ExpenseDto> & { id: string }): ExpenseDto {
  return {
    spent_on: "2026-04-18",
    name: p.name ?? "지출",
    category: p.category ?? "food",
    payer_id: p.payer_id ?? "m1",
    split: p.split ?? ["m1"],
    amount: p.amount ?? 0,
    currency: p.currency ?? "KRW",
    ...p,
  };
}

describe("expenseBase — 환산 amount*fx_rate (base=KRW)", () => {
  it("KRW 는 그대로", () => {
    expect(expenseBase(exp({ id: "e", amount: 10000, currency: "KRW" }))).toBe(10000);
  });
  it("JPY 는 ×9 환산", () => {
    expect(expenseBase(exp({ id: "e", amount: 1000, currency: "JPY" }))).toBe(9000);
  });
});

describe("byCategory — 카테고리별 합계·비중(내림차순)", () => {
  it("합계 내림차순 + 비중 합이 ~100", () => {
    const list = [
      exp({ id: "a", category: "shopping", amount: 18000 }),
      exp({ id: "b", category: "food", amount: 9000 }),
    ];
    const cats = byCategory(list);
    expect(cats[0].category).toBe("shopping");
    expect(cats[0].pct).toBe(67);
    expect(cats[1].category).toBe("food");
    expect(cats[1].pct).toBe(33);
  });
});

describe("byDay — 일자별 합계(오름차순) + 요일", () => {
  it("날짜순 정렬 + 합계", () => {
    const list = [
      exp({ id: "a", spent_on: "2026-04-19", amount: 5000 }),
      exp({ id: "b", spent_on: "2026-04-18", amount: 3000 }),
      exp({ id: "c", spent_on: "2026-04-18", amount: 2000 }),
    ];
    const days = byDay(list);
    expect(days.map((d) => d.date)).toEqual(["2026-04-18", "2026-04-19"]);
    expect(days[0].amountBase).toBe(5000);
    expect(days[0].label).toBe("4.18");
    expect(days[0].weekday).toBe("토"); // 2026-04-18 = 토요일
  });
});

describe("computeSettlements — 더치페이 송금 최소화", () => {
  it("결제자 1명·분담 3명 → 송금 2건(나머지 2명 → 결제자), 순액 정확", () => {
    // A 가 30000 결제, A·B·C 균등 분담 → 각 10000 부담. A +20000, B·C 각 -10000.
    const list = [exp({ id: "e1", payer_id: "A", split: ["A", "B", "C"], amount: 30000 })];
    const s = computeSettlements(list);
    expect(s).toHaveLength(2);
    expect(s.every((x) => x.to === "A")).toBe(true);
    expect(s.map((x) => x.from).sort()).toEqual(["B", "C"]);
    expect(s.every((x) => x.amountBase === 10000)).toBe(true);
  });

  it("상호 채무 상쇄 → 송금 건수 최소(순채권자에게 모이게)", () => {
    // A 결제 30000(A,B,C) → B,C 각 -10000, A +20000
    // B 결제 30000(A,B,C) → A,C 각 -10000, B +20000
    // 순잔액: A +10000, B +10000, C -20000 → C 가 A·B 에게 각 10000 (2건)
    const list = [
      exp({ id: "e1", payer_id: "A", split: ["A", "B", "C"], amount: 30000 }),
      exp({ id: "e2", payer_id: "B", split: ["A", "B", "C"], amount: 30000 }),
    ];
    const s = computeSettlements(list);
    expect(s.every((x) => x.from === "C")).toBe(true);
    const totalMoved = s.reduce((sum, x) => sum + x.amountBase, 0);
    expect(totalMoved).toBe(20000); // C 의 순채무와 일치
    expect(s.length).toBeLessThanOrEqual(2);
  });
});

describe("budgetMetrics — 총지출·1인당·남은예산·최다지출", () => {
  it("멤버 수 균등 1인당 + 남은예산 + 최다 카테고리", () => {
    const list = [
      exp({ id: "a", category: "hotel", amount: 40000, split: ["m1", "m2"] }),
      exp({ id: "b", category: "food", amount: 20000, split: ["m1", "m2"] }),
    ];
    const m = budgetMetrics(list, 100000, 2);
    expect(m.total).toBe(60000);
    expect(totalSpent(list)).toBe(60000);
    expect(m.perPerson).toBe(30000);
    expect(m.remaining).toBe(40000);
    expect(m.usedPct).toBe(60);
    expect(m.topCategory).toBe("hotel");
    expect(m.topCategoryAmount).toBe(40000);
  });
});
