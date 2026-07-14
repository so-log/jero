"use client";

import { useMemo, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { nightsDays } from "@/lib/tripDate";
import { cn } from "@/lib/utils";

import {
  formatDateInput,
  monthCells,
  parseISO,
  parseUserDate,
  shiftMonth,
} from "../lib/dateGrid";

/**
 * 범위 캘린더(재사용) — 임의 월 이동 그리드 + 클릭·타이핑 입력 필드 + 통일 강조색.
 * 값(start/end)은 ISO('YYYY-MM-DD') 문자열. 상태는 상위가 소유(controlled): 선택·타이핑 → onChange.
 * 03 생성 마법사 Step2 와 B3 여행 날짜 수정이 공유한다(중복 구현 금지).
 */
const DOW = ["일", "월", "화", "수", "목", "금", "토"];

type ActiveField = "start" | "end";

/** 시작/종료 입력 필드 — 클릭 시 해당 필드 활성(달력 기준 전환) + 직접 타이핑(파싱·검증). */
function DateField({
  label,
  iso,
  isActive,
  invalid,
  onActivate,
  onCommit,
}: {
  label: string;
  iso: string;
  isActive: boolean;
  invalid: boolean;
  onActivate: () => void;
  onCommit: (isoValue: string) => void;
}) {
  const [text, setText] = useState(() => formatDateInput(iso));
  // 달력 클릭 등 외부 변경 시 표시 동기화 — 렌더 중 조정(effect 불필요, React 권장 패턴).
  const [prevIso, setPrevIso] = useState(iso);
  if (iso !== prevIso) {
    setPrevIso(iso);
    setText(formatDateInput(iso));
  }

  const commit = () => {
    const parsed = parseUserDate(text);
    if (parsed) onCommit(parsed);
    else setText(formatDateInput(iso)); // 형식 불량 → 마지막 유효값으로 복원.
  };

  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <label className="text-[12.5px] font-bold text-body">{label}</label>
      <div
        className={cn(
          "flex h-[46px] items-center gap-2 rounded-md border-[1.5px] px-3.5 transition-colors",
          invalid
            ? "border-danger bg-danger-tint"
            : isActive
              ? "border-primary bg-primary-wash"
              : "border-line-strong bg-background",
        )}
      >
        <Icon
          name="calendar"
          size={16}
          className={isActive ? "text-primary" : "text-faint"}
        />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={onActivate}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
          placeholder="YYYY.M.D"
          inputMode="numeric"
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-body outline-none placeholder:font-medium placeholder:text-faint"
        />
      </div>
    </div>
  );
}

export interface RangeCalendarProps {
  /** 시작일 ISO('YYYY-MM-DD') 또는 "". */
  start: string;
  /** 종료일 ISO('YYYY-MM-DD') 또는 "". */
  end: string;
  /** 선택·타이핑 확정 시 새 (시작, 종료) 통지. 시작≤종료 규칙은 내부에서 강제. */
  onChange: (start: string, end: string) => void;
  invalid?: boolean;
  errorMessage?: string;
}

export function RangeCalendar({
  start,
  end,
  onChange,
  invalid = false,
  errorMessage,
}: RangeCalendarProps) {
  const [active, setActive] = useState<ActiveField>("start");
  // 보는 달: 시작일 있으면 그 달, 없으면 이번 달.
  const [view, setView] = useState<{ y: number; m: number }>(() => {
    const p = parseISO(start);
    if (p) return { y: p.y, m: p.m };
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth() };
  });

  const setStart = (iso: string) => {
    // 시작 변경 시 기존 종료가 더 이르면 종료 리셋(범위 재선택).
    onChange(iso, end && iso > end ? "" : end);
    setActive("end");
  };
  const setEnd = (iso: string) => {
    if (start && iso >= start) {
      onChange(start, iso);
      setActive("start");
    } else {
      // 시작보다 이르면 새 시작으로 리셋.
      onChange(iso, "");
      setActive("end");
    }
  };
  const applyDate = (field: ActiveField, iso: string) => {
    if (field === "start") setStart(iso);
    else setEnd(iso);
    const p = parseISO(iso);
    if (p) setView({ y: p.y, m: p.m });
  };
  const pick = (iso: string) => (active === "start" ? setStart(iso) : setEnd(iso));

  const cells = useMemo(() => monthCells(view.y, view.m), [view]);
  const nights = start && end ? nightsDays(start, end).label : null;

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-3.5">
        <DateField
          label="시작일"
          iso={start}
          isActive={active === "start"}
          invalid={invalid}
          onActivate={() => setActive("start")}
          onCommit={(iso) => applyDate("start", iso)}
        />
        <DateField
          label="종료일"
          iso={end}
          isActive={active === "end"}
          invalid={invalid}
          onActivate={() => setActive("end")}
          onCommit={(iso) => applyDate("end", iso)}
        />
      </div>
      {invalid && errorMessage && (
        <span className="-mt-2 text-[11.5px] font-semibold text-danger">
          {errorMessage}
        </span>
      )}

      <div className="rounded-panel border border-line p-4">
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="이전 달"
              onClick={() => setView((v) => shiftMonth(v, -1))}
              className="flex size-8 items-center justify-center rounded-md text-subtle hover:bg-secondary"
            >
              <Icon name="chevron-left" size={18} strokeWidth={2.2} />
            </button>
            <span className="min-w-[92px] text-center text-[15px] font-extrabold text-ink">
              {view.y}년 {view.m + 1}월
            </span>
            <button
              type="button"
              aria-label="다음 달"
              onClick={() => setView((v) => shiftMonth(v, 1))}
              className="flex size-8 items-center justify-center rounded-md text-subtle hover:bg-secondary"
            >
              <Icon name="chevron-right" size={18} strokeWidth={2.2} />
            </button>
          </div>
          {nights && (
            <span className="rounded-pill bg-primary-tint px-2.5 py-1 text-[12.5px] font-bold text-primary-hover">
              {nights}
            </span>
          )}
        </div>

        <div className="mb-1.5 grid grid-cols-7">
          {DOW.map((d, i) => (
            <div
              key={d}
              className={cn(
                "py-0.5 text-center text-[11.5px] font-bold",
                i === 0 ? "text-danger" : i === 6 ? "text-primary" : "text-faint",
              )}
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((cell) => {
            const isStart = cell.inMonth && cell.iso === start;
            const isEnd = cell.inMonth && cell.iso === end;
            const edge = isStart || isEnd;
            const inRange =
              cell.inMonth &&
              !!start &&
              !!end &&
              cell.iso > start &&
              cell.iso < end;
            return (
              <button
                key={cell.iso}
                type="button"
                disabled={!cell.inMonth}
                aria-pressed={edge}
                onClick={() => cell.inMonth && pick(cell.iso)}
                className={cn(
                  "flex h-[38px] items-center justify-center",
                  // 사이 범위(range) — 시작/종료와 같은 primary 계열 톤.
                  inRange && "bg-primary-tint",
                  isStart && !isEnd && "rounded-l-md bg-primary-tint",
                  isEnd && !isStart && "rounded-r-md bg-primary-tint",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full text-[13.5px]",
                    // 시작·종료 강조: 동일 토큰(bg-primary).
                    edge
                      ? "bg-primary font-extrabold text-white"
                      : cell.inMonth
                        ? "font-semibold text-body"
                        : "font-semibold text-mute",
                  )}
                >
                  {cell.n}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
