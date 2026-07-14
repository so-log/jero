"use client";

import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

import type { Day } from "../types";

/**
 * 모바일 플랜 컨트롤(반응형 3-B) — Day 스위처(‹ Day N ›) + [리스트 | 지도] 세그먼트. md+ 에선 숨김.
 * 리스트/지도를 나란히 두지 않고 한 화면에서 토글(둘 중 하나). 화살표·세그먼트 탭타깃 44px.
 */
export type PlanMode = "list" | "map";

const SEGMENTS: { value: PlanMode; label: string; icon: IconName }[] = [
  { value: "list", label: "리스트", icon: "list" },
  { value: "map", label: "지도", icon: "map-pin" },
];

interface MobilePlanControlsProps {
  days: Day[];
  activeDay: number;
  onDayChange: (index: number) => void;
  mode: PlanMode;
  onModeChange: (mode: PlanMode) => void;
}

export function MobilePlanControls({
  days,
  activeDay,
  onDayChange,
  mode,
  onModeChange,
}: MobilePlanControlsProps) {
  const day = days[activeDay];
  const move = (delta: number) =>
    onDayChange(Math.min(days.length - 1, Math.max(0, activeDay + delta)));
  const [, m, d] = day ? day.date.split("-").map(Number) : [0, 0, 0];

  return (
    <div className="flex-none border-b border-line bg-background px-4 py-3 md:hidden">
      {/* Day 스위처 */}
      <div className="flex items-center justify-center gap-1">
        <button
          type="button"
          aria-label="이전 날짜"
          onClick={() => move(-1)}
          disabled={activeDay <= 0}
          className="flex size-11 flex-none items-center justify-center rounded-xl text-subtle transition-colors hover:bg-secondary disabled:opacity-40"
        >
          <Icon name="chevron-left" size={22} strokeWidth={2.2} />
        </button>
        <div className="flex min-w-[150px] flex-col items-center">
          <span className="text-[16px] font-extrabold tracking-tight text-ink">
            {day?.label ?? ""}
          </span>
          {day && (
            <span className="text-[12px] font-semibold text-faint">
              {m}월 {d}일 · {day.weekday}요일
            </span>
          )}
        </div>
        <button
          type="button"
          aria-label="다음 날짜"
          onClick={() => move(1)}
          disabled={days.length === 0 || activeDay >= days.length - 1}
          className="flex size-11 flex-none items-center justify-center rounded-xl text-subtle transition-colors hover:bg-secondary disabled:opacity-40"
        >
          <Icon name="chevron-right" size={22} strokeWidth={2.2} />
        </button>
      </div>

      {/* 리스트 / 지도 세그먼트 */}
      <div
        role="tablist"
        aria-label="플랜 보기 전환"
        className="mt-3 flex gap-0.5 rounded-lg bg-secondary p-1"
      >
        {SEGMENTS.map((s) => {
          const on = mode === s.value;
          return (
            <button
              key={s.value}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onModeChange(s.value)}
              className={cn(
                "flex h-11 flex-1 items-center justify-center gap-1.5 rounded-md text-[13.5px] transition-colors",
                on
                  ? "bg-background font-bold text-primary-strong shadow-card"
                  : "font-semibold text-faint hover:text-subtle",
              )}
            >
              <Icon name={s.icon} size={16} strokeWidth={2} />
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
