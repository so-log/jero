"use client";

import { CATEGORY } from "@/lib/constants/category";
import { cn } from "@/lib/utils";

import { WEEKDAYS_KR, type MonthCell } from "../lib/calendar";

/**
 * 월 모드 — 달력 그리드. 날짜 셀에 카테고리 도트 + "N개 일정", 여행 기간일 강조, 선택일 원. 시안 buildMonth.
 */
interface MonthGridProps {
  weeks: MonthCell[][];
  selected: string;
  onSelectDate: (date: string, isTrip: boolean) => void;
}

export function MonthGrid({ weeks, selected, onSelectDate }: MonthGridProps) {
  return (
    <div className="flex h-full flex-col rounded-panel border border-line bg-background px-4 pt-3.5 pb-2 shadow-card">
      <div className="grid grid-cols-7">
        {WEEKDAYS_KR.map((d, i) => (
          <div
            key={d}
            className={cn(
              "py-1 text-center text-xs font-bold",
              i === 0 ? "text-danger" : i === 6 ? "text-primary" : "text-faint",
            )}
          >
            {d}
          </div>
        ))}
      </div>
      <div className="flex flex-1 flex-col">
        {weeks.map((week, w) => (
          <div key={w} className="grid flex-1 grid-cols-7">
            {week.map((cell, c) => {
              const isSel = cell.inMonth && cell.date === selected;
              return (
                <button
                  key={cell.date}
                  type="button"
                  disabled={!cell.inMonth}
                  onClick={() => onSelectDate(cell.date, cell.isTrip)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 px-2 pt-2 pb-1.5",
                    c < 6 && "border-r border-line",
                    w < weeks.length - 1 && "border-b border-line",
                    cell.inMonth ? "cursor-pointer" : "cursor-default",
                    cell.isTrip && !isSel && "bg-primary/[0.05]",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-[26px] items-center justify-center rounded-full text-[13.5px]",
                      isSel
                        ? "bg-primary font-extrabold text-white"
                        : cell.inMonth
                          ? cn(
                              c === 0
                                ? "text-danger"
                                : c === 6
                                  ? "text-primary"
                                  : "text-body",
                              cell.isTrip ? "font-bold" : "font-semibold",
                            )
                          : "font-semibold text-mute",
                    )}
                  >
                    {cell.day}
                  </span>
                  {cell.count > 0 && (
                    <>
                      <div className="flex gap-1">
                        {cell.categories.map((category, i) => (
                          <span
                            key={i}
                            className="size-1.5 rounded-full"
                            style={{ background: CATEGORY[category].fg }}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-semibold text-mute">
                        {cell.count}개 일정
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
