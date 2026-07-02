"use client";

import { cn } from "@/lib/utils";

/**
 * "선택한 날짜 일정만 보기" 토글 — OFF 시 저장 장소 마커(다이아) 함께 표시(설계 §6.4).
 */
interface FilterTodayToggleProps {
  checked: boolean;
  onToggle: () => void;
}

export function FilterTodayToggle({ checked, onToggle }: FilterTodayToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-md border border-line bg-background px-3 py-2.5"
    >
      <span className="text-[13px] font-semibold text-body">
        선택한 날짜 일정만 보기
      </span>
      <span
        className={cn(
          "relative h-[22px] w-[38px] flex-none rounded-pill transition-colors",
          checked ? "bg-primary" : "bg-line-strong",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-[18px] rounded-full bg-white shadow-card transition-all",
            checked ? "left-[18px]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}
