import { type CategoryKey } from "@/lib/constants/category";
import { convertToBase } from "@/lib/constants/fx";

import type { ExpenseDto } from "../types";

/**
 * 예산(07) 순수 셀렉터 — 환산(amount*fx_rate, base=KRW)·지표·차트 집계·더치페이 정산을 계산.
 * 부수효과 없음. 차트/표는 결과만 받는다(설계 §6, §7.1). 실제 운영은 서버 권위(§8.3) — 여기선 표시 계산.
 */
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;
const EPSILON = 0.5; // 원 단위 반올림 허용 오차

/** 원본 통화 → base(KRW) 환산. */
export function expenseBase(e: ExpenseDto): number {
  return convertToBase(e.amount, e.currency);
}

export function totalSpent(expenses: ExpenseDto[]): number {
  return expenses.reduce((sum, e) => sum + expenseBase(e), 0);
}

export interface CategoryTotal {
  category: CategoryKey;
  amountBase: number;
  pct: number;
}

/** 카테고리별 합계(도넛) — 금액 내림차순, 비중(%) 포함. */
export function byCategory(expenses: ExpenseDto[]): CategoryTotal[] {
  const total = totalSpent(expenses);
  const map = new Map<CategoryKey, number>();
  for (const e of expenses) {
    map.set(e.category, (map.get(e.category) ?? 0) + expenseBase(e));
  }
  return [...map.entries()]
    .map(([category, amountBase]) => ({
      category,
      amountBase,
      pct: total > 0 ? Math.round((amountBase / total) * 100) : 0,
    }))
    .sort((a, b) => b.amountBase - a.amountBase);
}

export interface DayTotal {
  date: string;
  label: string;
  weekday: string;
  amountBase: number;
}

/** 일자별 합계(막대) — 날짜 오름차순. */
export function byDay(expenses: ExpenseDto[]): DayTotal[] {
  const map = new Map<string, number>();
  for (const e of expenses) {
    map.set(e.spent_on, (map.get(e.spent_on) ?? 0) + expenseBase(e));
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amountBase]) => {
      const [y, m, d] = date.split("-").map(Number);
      return {
        date,
        label: `${m}.${d}`,
        weekday: WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()],
        amountBase,
      };
    });
}

export interface Settlement {
  from: string;
  to: string;
  amountBase: number;
}

/**
 * 더치페이 정산 — 결제자(+)·분담(−) 순잔액 → 송금 건수 최소화(그리디).
 * 분담은 균등 N분의 1. 채권자/채무자를 큰 금액부터 매칭한다.
 */
export function computeSettlements(expenses: ExpenseDto[]): Settlement[] {
  const balance = new Map<string, number>();
  const add = (id: string, v: number) =>
    balance.set(id, (balance.get(id) ?? 0) + v);

  for (const e of expenses) {
    const base = expenseBase(e);
    if (e.split.length === 0) continue;
    const share = base / e.split.length;
    add(e.payer_id, base);
    for (const m of e.split) add(m, -share);
  }

  const creditors = [...balance.entries()]
    .filter(([, v]) => v > EPSILON)
    .map(([id, v]) => ({ id, amt: v }))
    .sort((a, b) => b.amt - a.amt);
  const debtors = [...balance.entries()]
    .filter(([, v]) => v < -EPSILON)
    .map(([id, v]) => ({ id, amt: -v }))
    .sort((a, b) => b.amt - a.amt);

  const settlements: Settlement[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    const rounded = Math.round(pay);
    if (rounded > 0) {
      settlements.push({
        from: debtors[i].id,
        to: creditors[j].id,
        amountBase: rounded,
      });
    }
    debtors[i].amt -= pay;
    creditors[j].amt -= pay;
    if (debtors[i].amt < EPSILON) i++;
    if (creditors[j].amt < EPSILON) j++;
  }
  return settlements;
}

export interface BudgetMetrics {
  total: number;
  perPerson: number;
  remaining: number;
  usedPct: number;
  expenseCount: number;
  dailyAvg: number;
  topCategory: CategoryKey | null;
  topCategoryAmount: number;
}

export function budgetMetrics(
  expenses: ExpenseDto[],
  totalBudget: number,
  memberCount: number,
): BudgetMetrics {
  const total = totalSpent(expenses);
  const cats = byCategory(expenses);
  const days = byDay(expenses);
  const top = cats[0] ?? null;
  return {
    total,
    perPerson: memberCount > 0 ? Math.round(total / memberCount) : 0,
    remaining: totalBudget - total,
    usedPct: totalBudget > 0 ? Math.round((total / totalBudget) * 100) : 0,
    expenseCount: expenses.length,
    dailyAvg: days.length > 0 ? Math.round(total / days.length) : 0,
    topCategory: top?.category ?? null,
    topCategoryAmount: top?.amountBase ?? 0,
  };
}
