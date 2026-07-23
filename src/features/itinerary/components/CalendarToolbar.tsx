"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { cn } from "@/lib/utils";

import type { CalendarMode } from "../store/calendarStore";

/**
 * 일정표 전용 툴바 — 이전/오늘/다음 + 기간 라벨 + 모드 세그먼트(월/주/일) + 일정 추가. 시안 view toolbar.
 */
interface CalendarToolbarProps {
  rangeLabel: string;
  mode: CalendarMode;
  canEdit: boolean;
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
  onModeChange: (mode: CalendarMode) => void;
  /** "일정 추가"(editor+) — 선택 날짜에 장소 추가 플로우(B6 Day 맥락). */
  onAddPlace: () => void;
}

const MODE_ITEMS = [
  { value: "month", label: "월" },
  { value: "week", label: "주" },
  { value: "day", label: "일" },
];

export function CalendarToolbar({
  rangeLabel,
  mode,
  canEdit,
  onPrev,
  onToday,
  onNext,
  onModeChange,
  onAddPlace,
}: CalendarToolbarProps) {
  const navBtn =
    "flex h-[34px] items-center justify-center border border-line-strong bg-background text-faint hover:bg-secondary";
  return (
    <div className="flex h-[60px] flex-none items-center justify-between border-b border-line bg-background px-[22px]">
      <div className="flex items-center gap-3.5">
        <div className="flex items-center">
          <button
            type="button"
            aria-label="이전"
            onClick={onPrev}
            className={cn(navBtn, "w-[34px] rounded-l-md border-r-0")}
          >
            <Icon name="chevron-left" size={17} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            onClick={onToday}
            className={cn(navBtn, "px-3.5 text-[13px] font-bold text-body")}
          >
            오늘
          </button>
          <button
            type="button"
            aria-label="다음"
            onClick={onNext}
            className={cn(navBtn, "w-[34px] rounded-r-md border-l-0")}
          >
            <Icon name="chevron-right" size={17} strokeWidth={2.2} />
          </button>
        </div>
        <span className="text-lg font-extrabold tracking-tight text-ink">
          {rangeLabel}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <SegmentedTabs
          items={MODE_ITEMS}
          value={mode}
          onValueChange={(v) => onModeChange(v as CalendarMode)}
          size="sm"
          aria-label="달력 모드"
        />
        {canEdit && (
          <Button
            variant="primary"
            size="sm"
            className="gap-1.5 pr-4 pl-3"
            onClick={onAddPlace}
          >
            <Icon name="plus" size={17} strokeWidth={2.3} />
            일정 추가
          </Button>
        )}
      </div>
    </div>
  );
}
