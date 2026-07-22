"use client";

import { CATEGORY } from "@/lib/constants/category";
import { cn } from "@/lib/utils";

import { WEEKDAYS_KR, type MonthCell } from "../lib/calendar";

/** 셀 도시 정보(다중 도시 Phase 3) — 도시 색 밴드 + 시작일 배지. */
export interface MonthCityInfo {
  name: string;
  /** 강조색(시작일 배지·도트). */
  color: string;
  /** 옅은 배경(도시 구간 밴드). */
  tint: string;
  /** 이 날짜가 도시 첫날인지. */
  isStart: boolean;
}

/**
 * 월 모드 — 달력 그리드. 날짜 셀에 카테고리 도트 + "N개 일정", 여행 기간일 강조, 선택일 원. 시안 buildMonth.
 * 다중 도시(cityOf 전달 시): 셀 배경을 도시 색 밴드로, 도시 첫날엔 도시명 배지를 얹는다. 없으면 기존 렌더 그대로.
 */
interface MonthGridProps {
  weeks: MonthCell[][];
  selected: string;
  onSelectDate: (date: string, isTrip: boolean) => void;
  /** 날짜 → 도시 색 정보(다중 도시). 미지정이면 단일 도시(회귀 0). */
  cityOf?: (date: string) => MonthCityInfo | null;
}

export function MonthGrid({
  weeks,
  selected,
  onSelectDate,
  cityOf,
}: MonthGridProps) {
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
              const city = cell.inMonth ? (cityOf?.(cell.date) ?? null) : null;
              return (
                <button
                  key={cell.date}
                  type="button"
                  disabled={!cell.inMonth}
                  onClick={() => onSelectDate(cell.date, cell.isTrip)}
                  style={city && !isSel ? { background: city.tint } : undefined}
                  className={cn(
                    "flex flex-col items-center gap-1.5 px-2 pt-2 pb-1.5",
                    c < 6 && "border-r border-line",
                    w < weeks.length - 1 && "border-b border-line",
                    cell.inMonth ? "cursor-pointer" : "cursor-default",
                    // 도시 밴드는 인라인 tint 로 표현. 단일 도시일 때만 기존 primary wash.
                    !city && cell.isTrip && !isSel && "bg-primary/[0.05]",
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
                  {city?.isStart && (
                    <span
                      className="max-w-full truncate rounded-full px-1.5 py-px text-[9.5px] font-bold text-white"
                      style={{ background: city.color }}
                    >
                      {city.name}
                    </span>
                  )}
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
