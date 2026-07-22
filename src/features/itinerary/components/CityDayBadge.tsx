"use client";

import { cityColor } from "@/lib/constants/cityColors";

import type { DayCity } from "../lib/citySelectors";

/**
 * Day 도시 컨텍스트(다중 도시 Phase 3, 시안 §2) — 현재 도시 pill + 시작일 배지("4월 11일 · 오사카 첫날").
 * 첫날이 아니면 "4월 11일 · 오사카". 색은 cityColors 팔레트(인라인 style).
 */
interface CityDayBadgeProps {
  dayCity: DayCity;
  /** 기준 날짜('YYYY-MM-DD') — 배지 날짜 표기. */
  date: string;
  /** 가운데 정렬(모바일 Day 내비 하단). 기본 왼쪽. */
  center?: boolean;
}

export function CityDayBadge({ dayCity, date, center = false }: CityDayBadgeProps) {
  const { segment, isCityStart } = dayCity;
  const color = cityColor(segment.seq);
  const [, m, d] = date.split("-").map(Number);
  const dateLabel = `${m}월 ${d}일 · ${segment.name}${isCityStart ? " 첫날" : ""}`;

  return (
    <div
      className={`flex items-center gap-2 ${center ? "justify-center" : ""}`}
    >
      <span
        className="inline-flex items-center gap-1.5 rounded-full py-0.5 pr-2.5 pl-2"
        style={{ background: color.tint }}
      >
        <span
          className="size-[7px] flex-none rounded-full"
          style={{ background: color.color }}
        />
        <span
          className="text-[11.5px] font-bold whitespace-nowrap"
          style={{ color: color.color }}
        >
          {segment.name}
        </span>
      </span>
      <span className="text-[12px] font-semibold whitespace-nowrap text-mute">
        {dateLabel}
      </span>
    </div>
  );
}
