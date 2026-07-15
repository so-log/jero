"use client";

import { Button } from "@/components/ui/button";
import { CategoryTile } from "@/components/ui/category-chip";
import { Icon } from "@/components/ui/icon";
import type { MemberDto } from "@/features/itinerary";
import { CATEGORY } from "@/lib/constants/category";
import { formatKRW } from "@/lib/currency";

import { expenseBase } from "../lib/budget";
import type { ExpenseDto } from "../types";

/**
 * 지출 내역 표 — 날짜 / 항목(카테고리·이름·라벨) / 결제자 / 분담 / 금액(KRW 환산). 시안 expense table.
 * 금액은 셀렉터(expenseBase=amount*fx_rate) 환산값 표시. "지출 추가"는 오버레이 seam(스텁).
 */
interface ExpenseTableProps {
  expenses: ExpenseDto[];
  members: MemberDto[];
  canEdit: boolean;
  onAddExpense: () => void;
  /** 행 클릭 편집(editor+). 없으면 행은 비활성(읽기 전용). */
  onEditExpense?: (id: string) => void;
}

const COLS = "grid-cols-[78px_1fr_96px_84px_110px]";

export function ExpenseTable({
  expenses,
  members,
  canEdit,
  onAddExpense,
  onEditExpense,
}: ExpenseTableProps) {
  const memberById = new Map(members.map((m) => [m.id, m]));
  const formatDate = (iso: string) => {
    const [, m, d] = iso.split("-").map(Number);
    return `${m}.${d}`;
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-panel border border-line bg-background shadow-card">
      <div className="flex items-center justify-between border-b border-line px-5 pt-4 pb-3.5">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-bold text-ink">지출 내역</span>
          <span className="text-[12.5px] font-semibold text-faint">
            {expenses.length}건
          </span>
        </div>
        {canEdit && (
          <Button
            variant="primary"
            size="sm"
            onClick={onAddExpense}
            className="gap-1.5 pr-4 pl-3"
          >
            <Icon name="plus" size={17} strokeWidth={2.3} />
            지출 추가
          </Button>
        )}
      </div>

      {/* 좁은 폭(모바일)에선 가로 스크롤 — 컬럼 최소폭 유지(데스크톱은 넉넉해 스크롤 없음) */}
      <div className="overflow-x-auto">
        <div className="min-w-[460px]">
          <div
            className={`grid ${COLS} gap-3 border-b border-line bg-surface px-5 py-2.5 text-[11.5px] font-bold tracking-wide text-faint`}
          >
            <span>날짜</span>
            <span>항목</span>
            <span>결제자</span>
            <span className="text-center">분담</span>
            <span className="text-right">금액</span>
          </div>

          <div className="max-h-[236px] overflow-y-auto">
        {expenses.map((e) => {
          const payer = memberById.get(e.payer_id);
          const editable = !!onEditExpense;
          return (
            <div
              key={e.id}
              role={editable ? "button" : undefined}
              tabIndex={editable ? 0 : undefined}
              aria-label={editable ? `${e.name} 편집` : undefined}
              onClick={editable ? () => onEditExpense(e.id) : undefined}
              onKeyDown={
                editable
                  ? (ev) => {
                      if (ev.key === "Enter" || ev.key === " ") {
                        ev.preventDefault();
                        onEditExpense(e.id);
                      }
                    }
                  : undefined
              }
              className={`grid ${COLS} items-center gap-3 border-b border-line px-5 py-3 last:border-0 hover:bg-surface ${
                editable
                  ? "cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
                  : ""
              }`}
            >
              <span className="text-[12.5px] font-semibold text-faint">
                {formatDate(e.spent_on)}
              </span>
              <div className="flex min-w-0 items-center gap-2.5">
                <CategoryTile category={e.category} size={32} />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-[13.5px] font-semibold text-body">
                    {e.name}
                  </span>
                  <span className="text-[11.5px] font-medium text-mute">
                    {CATEGORY[e.category].label}
                  </span>
                </div>
              </div>
              <div className="flex min-w-0 items-center gap-1.5">
                {payer && (
                  <>
                    <span
                      className="flex size-6 flex-none items-center justify-center rounded-full border-2 bg-background text-[10px] font-bold"
                      style={{ borderColor: payer.color, color: payer.color }}
                    >
                      {payer.initial}
                    </span>
                    <span className="truncate text-[12.5px] font-semibold text-subtle">
                      {payer.name}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center justify-center">
                {e.split.map((id, i) => {
                  const m = memberById.get(id);
                  if (!m) return null;
                  return (
                    <span
                      key={id}
                      title={m.name}
                      className="flex size-[22px] items-center justify-center rounded-full border-2 bg-background text-[9px] font-bold ring-[1.5px] ring-background"
                      style={{
                        borderColor: m.color,
                        color: m.color,
                        marginLeft: i === 0 ? 0 : -7,
                      }}
                    >
                      {m.initial}
                    </span>
                  );
                })}
              </div>
              <span className="text-right text-[13.5px] font-bold tracking-tight text-ink">
                {formatKRW(expenseBase(e))}
              </span>
            </div>
          );
        })}
          </div>
        </div>
      </div>
    </div>
  );
}
