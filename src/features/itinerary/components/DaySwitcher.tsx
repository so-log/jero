"use client";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

import type { Day } from "../types";

/**
 * 날짜 스위처 — Day 1~N(날짜·요일) + 이전/다음. 시안 dayBar. 전환 시 선택 초기화(store).
 */
interface DaySwitcherProps {
  days: Day[];
  activeDay: number;
  onSelect: (index: number) => void;
}

export function DaySwitcher({ days, activeDay, onSelect }: DaySwitcherProps) {
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
          return (
            <button
              key={day.index}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(day.index)}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-md px-1 py-1.5 transition-colors",
                active ? "bg-primary text-white" : "text-subtle hover:bg-secondary",
              )}
            >
              <span className="text-[11px] font-bold">{day.label}</span>
              <span
                className={cn(
                  "text-[11px] font-medium",
                  active ? "text-white/85" : "text-faint",
                )}
              >
                {m}.{d} ({day.weekday})
              </span>
            </button>
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
