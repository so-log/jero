"use client";

import { cn } from "@/lib/utils";

/**
 * 세그먼트(알약형) 토글 — 디자인 시스템.dc.html v1.0.
 * 뷰 전환(플랜/일정표/장소/예산), 월/주/일, 목록 필터(예정/지난/전체) 등에 공용.
 */
export interface SegmentedTabItem {
  value: string;
  label: string;
}

export interface SegmentedTabsProps {
  items: SegmentedTabItem[];
  value: string;
  onValueChange: (value: string) => void;
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
}

export function SegmentedTabs({
  items,
  value,
  onValueChange,
  size = "md",
  className,
  "aria-label": ariaLabel,
}: SegmentedTabsProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md bg-secondary p-1",
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onValueChange(item.value)}
            className={cn(
              "inline-flex items-center justify-center rounded-xs whitespace-nowrap transition-colors",
              size === "md" ? "h-9 px-4 text-[13px]" : "h-8 px-3.5 text-[13px]",
              active
                ? "bg-background font-bold text-primary-strong shadow-card"
                : "font-semibold text-faint hover:text-subtle",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
