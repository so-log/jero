"use client";

import { Fragment } from "react";

import { Icon } from "@/components/ui/icon";
import { cityForDate, type CitySegment } from "@/features/trip";
import { cityColor } from "@/lib/constants/cityColors";
import { cn } from "@/lib/utils";

import type { Day } from "../types";

/**
 * 날짜 스위처 — Day 1~N(날짜·요일) + 이전/다음. 시안 dayBar. 전환 시 선택 초기화(store).
 * 다중 도시(segments 전달 시): 각 Day 를 도시 색(tint/solid)으로 칠하고, 도시가 바뀌는 경계에
 * 점선 구분선을 넣는다("도쿄 Day 3" 다음 "오사카 Day 1"). segments 없으면 기존 단일 도시 렌더 그대로(회귀 0).
 */
interface DaySwitcherProps {
  days: Day[];
  activeDay: number;
  onSelect: (index: number) => void;
  /** 다중 도시 파생 구간(seq 순). 2개 이상일 때만 도시 색·경계 렌더. */
  segments?: CitySegment[];
}

export function DaySwitcher({
  days,
  activeDay,
  onSelect,
  segments,
}: DaySwitcherProps) {
  const multi = (segments?.length ?? 0) > 1;
  const cityOf = (date: string) =>
    multi ? cityForDate(segments as CitySegment[], date) : null;

  const move = (delta: number) =>
    onSelect(Math.min(days.length - 1, Math.max(0, activeDay + delta)));

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="이전 날짜"
        onClick={() => move(-1)}
        disabled={activeDay === 0}
        className="flex h-[38px] w-[30px] flex-none items-center justify-center rounded-md border border-line bg-background text-faint disabled:opacity-40"
      >
        <Icon name="chevron-left" size={17} />
      </button>
      <div className="flex flex-1 gap-1">
        {days.map((day) => {
          const active = day.index === activeDay;
          const [, m, d] = day.date.split("-").map(Number);
          const seg = cityOf(day.date);
          const color = seg ? cityColor(seg.seq) : null;
          // 도시 경계: 앞 Day 와 도시가 다르면 점선 구분선.
          const prevSeg = day.index > 0 ? cityOf(days[day.index - 1].date) : null;
          const boundary = !!seg && !!prevSeg && seg.cityId !== prevSeg.cityId;

          // 색: 다중 도시면 활성=도시색, 비활성=도시 tint. 단일 도시면 기존 primary/secondary.
          const style =
            color && active
              ? { background: color.color }
              : color
                ? { background: color.tint }
                : undefined;

          return (
            <Fragment key={day.index}>
              {boundary && (
                <span
                  aria-hidden
                  className="my-1 flex-none self-stretch border-l-2 border-dashed"
                  style={{ borderColor: color?.line }}
                />
              )}
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(day.index)}
                style={style}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-md px-1 py-1.5 transition-colors",
                  active
                    ? color
                      ? "text-white"
                      : "bg-primary text-white"
                    : color
                      ? "hover:brightness-95"
                      : "text-subtle hover:bg-secondary",
                )}
              >
                <span
                  className="text-[11px] font-bold"
                  style={
                    !active && color ? { color: color.color } : undefined
                  }
                >
                  {day.label}
                </span>
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    active ? "text-white/85" : color ? "text-subtle" : "text-faint",
                  )}
                >
                  {m}.{d} ({day.weekday})
                </span>
              </button>
            </Fragment>
          );
        })}
      </div>
      <button
        type="button"
        aria-label="다음 날짜"
        onClick={() => move(1)}
        disabled={activeDay === days.length - 1}
        className="flex h-[38px] w-[30px] flex-none items-center justify-center rounded-md border border-line bg-background text-faint disabled:opacity-40"
      >
        <Icon name="chevron-right" size={17} />
      </button>
    </div>
  );
}
