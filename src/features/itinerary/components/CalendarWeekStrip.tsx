"use client";

import { CATEGORY } from "@/lib/constants/category";
import { cn } from "@/lib/utils";

import { dayOfMonth, weekdayIndex, weekdayKR } from "../lib/calendar";
import type { PlaceDto } from "../types";

/**
 * 모바일 7일 날짜 스트립(반응형 3-C) — 월 그리드 대신 주 단위 셀. 셀 탭타깃 44px+.
 * 선택일 강조(primary) · 여행기간 표시(wash) · 일정 유무 도트. 날짜 선택은 상위(setCursor)로 위임.
 */
interface CalendarWeekStripProps {
  /** 표시할 7일(ISO, 일~토). */
  days: string[];
  /** 선택된 날짜(ISO). */
  selected: string;
  byDate: Map<string, PlaceDto[]>;
  tripStart: string;
  tripEnd: string;
  onSelect: (iso: string) => void;
  /** 날짜 → 도시 색(다중 도시). 미지정이면 기존 primary 색(회귀 0). */
  cityOf?: (date: string) => { color: string; tint: string } | null;
}

export function CalendarWeekStrip({
  days,
  selected,
  byDate,
  tripStart,
  tripEnd,
  onSelect,
  cityOf,
}: CalendarWeekStripProps) {
  return (
    <div className="flex gap-1.5">
      {days.map((iso) => {
        const on = iso === selected;
        const isTrip = iso >= tripStart && iso <= tripEnd;
        const dow = weekdayIndex(iso);
        const list = byDate.get(iso) ?? [];
        const city = cityOf?.(iso) ?? null;
        const dotColor = city
          ? city.color
          : list[0]
            ? CATEGORY[list[0].category].fg
            : null;
        // 도시 색은 인라인(팔레트). 선택=도시 강조색, 여행일=도시 tint. 없으면 기존 primary.
        const bandStyle =
          city && on
            ? { background: city.color }
            : city && isTrip
              ? { background: city.tint }
              : undefined;
        return (
          <button
            key={iso}
            type="button"
            aria-pressed={on}
            aria-label={`${dayOfMonth(iso)}일 ${weekdayKR(iso)}요일`}
            onClick={() => onSelect(iso)}
            style={bandStyle}
            className={cn(
              "flex min-h-[52px] flex-1 flex-col items-center gap-1 rounded-lg py-2 transition-colors",
              city
                ? "hover:brightness-95"
                : on
                  ? "bg-primary"
                  : isTrip
                    ? "bg-primary-tint hover:bg-primary-tint/70"
                    : "hover:bg-secondary",
            )}
          >
            <span
              className={cn(
                "text-[10.5px] font-bold",
                on
                  ? "text-white/80"
                  : dow === 0
                    ? "text-danger"
                    : dow === 6
                      ? "text-primary"
                      : "text-mute",
              )}
            >
              {weekdayKR(iso)}
            </span>
            <span
              className={cn(
                "text-[15px] font-extrabold",
                on ? "text-white" : "text-body",
              )}
            >
              {dayOfMonth(iso)}
            </span>
            <span
              className="size-[5px] rounded-full"
              style={{
                background: list.length
                  ? on
                    ? "#fff"
                    : (dotColor ?? "transparent")
                  : "transparent",
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
