"use client";

import { useState } from "react";

import { Icon } from "@/components/ui/icon";
import type { Day } from "@/features/itinerary";
import { cn } from "@/lib/utils";

/**
 * "일정에 추가" 진입점(04 §13 배정 플로우) — Day 선택 드롭다운 / "Day N에 추가됨" + 취소 / viewer "저장된 장소".
 * 실제 배정은 useAddPlaceToSchedule 스텁(로컬 UI). 시안 buildAction.
 */
interface AddToScheduleMenuProps {
  days: Day[];
  /** 배정된 Day 번호(1-based) | null. */
  assignedDay: number | null;
  canEdit: boolean;
  onAssign: (day: number) => void;
  onUnassign: () => void;
}

export function AddToScheduleMenu({
  days,
  assignedDay,
  canEdit,
  onAssign,
  onUnassign,
}: AddToScheduleMenuProps) {
  const [open, setOpen] = useState(false);

  if (assignedDay != null) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex h-[30px] items-center gap-1.5 rounded-pill bg-success-tint px-3 text-[12.5px] font-bold text-success">
          <Icon name="check" size={14} strokeWidth={2.6} />
          Day {assignedDay}에 추가됨
        </span>
        {canEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUnassign();
            }}
            className="px-1 text-xs font-semibold text-mute hover:text-subtle"
          >
            취소
          </button>
        )}
      </div>
    );
  }

  if (!canEdit) {
    return <span className="text-xs font-semibold text-mute">저장된 장소</span>;
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-md border pr-3 pl-2.5 text-[12.5px] font-bold transition-colors",
          open
            ? "border-primary bg-primary-wash text-primary-hover"
            : "border-line-strong bg-background text-body hover:bg-secondary",
        )}
      >
        <Icon name="calendar" size={15} strokeWidth={2} />
        일정에 추가
        <Icon name="chevron-down" size={14} strokeWidth={2} />
      </button>

      {open && (
        <>
          {/* 바깥 클릭 닫기 */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-10 cursor-default"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-[calc(100%+6px)] left-0 z-20 w-[188px] rounded-lg border border-line bg-popover p-1.5 shadow-modal"
          >
            <div className="px-2.5 pt-1 pb-1.5 text-[11px] font-bold text-faint">
              어느 날짜에 추가할까요?
            </div>
            {days.map((day) => {
              const [, m, d] = day.date.split("-").map(Number);
              return (
                <button
                  key={day.index}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAssign(day.index + 1);
                    setOpen(false);
                  }}
                  className="flex h-[38px] w-full items-center justify-between rounded-md px-2.5 hover:bg-secondary"
                >
                  <span className="flex items-center gap-2">
                    <span className="flex size-[22px] items-center justify-center rounded-md bg-primary-tint text-[11px] font-extrabold text-primary-hover">
                      {day.index + 1}
                    </span>
                    <span className="text-[13px] font-semibold text-body">
                      {day.label}
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-mute">
                    {m}.{d}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
