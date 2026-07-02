"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { useMembersQuery, usePlacesQuery } from "@/features/itinerary";
import { CATEGORY } from "@/lib/constants/category";
import { canEdit as roleCanEdit } from "@/lib/constants/roles";
import { formatKRW } from "@/lib/currency";

import { useBudgetQuery } from "../api/useBudgetQuery";
import { useExpenseActions } from "../api/useExpenseActions";
import {
  budgetMetrics,
  byCategory,
  byDay,
  computeSettlements,
} from "../lib/budget";
import { CategoryDonut } from "./CategoryDonut";
import { DailyTrend } from "./DailyTrend";
import { ExpenseTable } from "./ExpenseTable";
import { MetricCard } from "./MetricCard";
import { SettlementSummary } from "./SettlementSummary";

/**
 * 07 예산/정산 대시보드 — 지표 4 + 도넛·막대 + 정산 + 지출 표(설계 §3).
 * 환산·집계·정산은 순수 셀렉터(lib/budget.ts)로 계산하고 차트/표는 결과만 받는다(§7.1).
 * 지출 추가·정산 완료는 오버레이/뮤테이션 seam 스텁(useExpenseActions).
 */
export function BudgetView({ tripId }: { tripId: string }) {
  const { data, isLoading } = useBudgetQuery(tripId);
  const { data: members = [] } = useMembersQuery(tripId);
  const { data: trip } = usePlacesQuery(tripId);
  const { openAddExpense, markSettled } = useExpenseActions();

  // 권한은 trip.my_role 단일 소스(셸과 동일 쿼리 캐시) — 서버/RLS 가 최종 강제(§8.2).
  const canEdit = trip ? roleCanEdit(trip.trip.my_role) : false;

  const expenses = useMemo(() => data?.expenses ?? [], [data]);
  const metrics = useMemo(
    () => budgetMetrics(expenses, data?.total_budget ?? 0, members.length),
    [expenses, data?.total_budget, members.length],
  );
  const cats = useMemo(() => byCategory(expenses), [expenses]);
  const days = useMemo(() => byDay(expenses), [expenses]);
  const settlements = useMemo(() => computeSettlements(expenses), [expenses]);

  if (isLoading || !data) {
    return <BudgetSkeleton />;
  }

  if (expenses.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface">
        <EmptyState
          icon="wallet"
          title="아직 지출 내역이 없어요"
          description="첫 지출을 추가하면 카테고리별 비중과 더치페이 정산이 자동으로 계산돼요."
          action={
            canEdit ? (
              <Button variant="primary" size="lg" className="gap-2" onClick={openAddExpense}>
                <Icon name="plus" size={20} strokeWidth={2.3} />
                지출 추가하기
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  const topLabel = metrics.topCategory ? CATEGORY[metrics.topCategory].label : "—";

  return (
    <div className="h-full w-full overflow-y-auto bg-surface">
      <div className="flex flex-col gap-4 p-6">
        {/* 지표 카드 4 */}
        <div className="grid grid-cols-4 gap-4">
          <MetricCard
            label="총지출"
            value={formatKRW(metrics.total)}
            icon="wallet"
            tone="primary"
            sub={
              <span className="text-[11.5px] font-semibold text-faint">
                지출 {metrics.expenseCount}건
              </span>
            }
          />
          <MetricCard
            label="1인당 금액"
            value={formatKRW(metrics.perPerson)}
            icon="users"
            tone="success"
            sub={
              <span className="text-[11.5px] font-semibold text-faint">
                멤버 {members.length}명 균등 분담
              </span>
            }
          />
          <MetricCard
            label="남은 예산"
            value={formatKRW(metrics.remaining)}
            icon="piggy-bank"
            tone="violet"
            sub={
              <div className="flex flex-col gap-1.5">
                <div className="h-1.5 overflow-hidden rounded-pill bg-secondary">
                  <div
                    className="h-full rounded-pill"
                    style={{
                      width: `${Math.min(metrics.usedPct, 100)}%`,
                      background:
                        metrics.usedPct > 90
                          ? "var(--color-danger)"
                          : "var(--primary)",
                    }}
                  />
                </div>
                <span className="text-[11.5px] font-semibold text-faint">
                  설정 {formatKRW(data.total_budget)} · {metrics.usedPct}% 사용
                </span>
              </div>
            }
          />
          <MetricCard
            label="최다 지출"
            value={topLabel}
            icon="trending-up"
            tone="danger"
            sub={
              <span className="inline-flex w-max items-center rounded-pill bg-success-tint px-2.5 py-0.5 text-[11.5px] font-bold text-success">
                {formatKRW(metrics.topCategoryAmount)}
              </span>
            }
          />
        </div>

        {/* 차트 행 */}
        <div className="grid grid-cols-[420px_1fr] gap-4">
          <CategoryDonut data={cats} />
          <DailyTrend data={days} dailyAvg={metrics.dailyAvg} />
        </div>

        {/* 정산 + 표 행 */}
        <div className="grid grid-cols-[420px_1fr] items-start gap-4">
          <SettlementSummary
            settlements={settlements}
            members={members}
            canEdit={canEdit}
            onMarkSettled={markSettled}
          />
          <ExpenseTable
            expenses={expenses}
            members={members}
            canEdit={canEdit}
            onAddExpense={openAddExpense}
          />
        </div>
      </div>
    </div>
  );
}

function BudgetSkeleton() {
  return (
    <div className="h-full w-full overflow-y-auto bg-surface">
      <div className="flex flex-col gap-4 p-6">
        <div className="grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[108px] animate-pulse rounded-panel bg-secondary" />
          ))}
        </div>
        <div className="grid grid-cols-[420px_1fr] gap-4">
          <div className="h-[268px] animate-pulse rounded-panel bg-secondary" />
          <div className="h-[268px] animate-pulse rounded-panel bg-secondary" />
        </div>
      </div>
    </div>
  );
}
