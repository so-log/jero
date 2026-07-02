"use client";

import { CategoryTile } from "@/components/ui/category-chip";
import { CATEGORY } from "@/lib/constants/category";

import { hoursToTime, timeToHours } from "../lib/calendar";
import type { MemberDto, PlaceDto } from "../types";

/**
 * 일 모드 — 세로 타임라인. 시각(시작–종료) + 커넥터 도트/라인 + 일정 카드(카테고리·이름·메모·추가 멤버). 시안 buildDay.
 */
interface DayTimelineProps {
  places: PlaceDto[];
  members: MemberDto[];
}

export function DayTimeline({ places, members }: DayTimelineProps) {
  const memberById = new Map(members.map((m) => [m.id, m]));

  return (
    <div className="mx-auto flex max-w-[720px] flex-col px-[22px] pt-3.5">
      {places.map((place, i) => {
        const c = CATEGORY[place.category];
        const last = i === places.length - 1;
        const start = timeToHours(place.start_time);
        const endLabel =
          start != null
            ? hoursToTime(start + (place.duration_min ?? 60) / 60)
            : null;
        const by = place.scheduled_by
          ? memberById.get(place.scheduled_by)
          : undefined;

        return (
          <div key={place.id} className="flex gap-3.5">
            {/* 시간 거터 */}
            <div className="w-12 flex-none pt-3.5 text-right">
              <div className="text-[13px] font-bold text-body">
                {place.start_time}
              </div>
              {endLabel && (
                <div className="text-[11px] font-medium text-mute">
                  {endLabel}
                </div>
              )}
            </div>
            {/* 커넥터 */}
            <div className="flex flex-none flex-col items-center pt-[15px]">
              <span
                className="size-[11px] flex-none rounded-full border-[2.5px] bg-background"
                style={{ borderColor: c.fg }}
              />
              {!last && (
                <span className="mt-0.5 min-h-[30px] w-0.5 flex-1 bg-line" />
              )}
            </div>
            {/* 카드 */}
            <div className="mb-3.5 flex flex-1 items-center gap-3 rounded-[15px] border border-line bg-background px-[15px] py-3 shadow-card">
              <CategoryTile category={place.category} size={40} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[15px] font-bold text-ink">
                    {place.name}
                  </span>
                  <span
                    className="flex-none rounded-pill px-2 py-0.5 text-[11px] font-bold"
                    style={{ background: c.bg, color: c.fg }}
                  >
                    {c.label}
                  </span>
                </div>
                {place.memo && (
                  <div className="truncate text-[12.5px] font-medium text-faint">
                    {place.memo}
                  </div>
                )}
              </div>
              {by && (
                <div className="flex flex-none items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-mute">
                    추가
                  </span>
                  <span
                    className="flex size-6 items-center justify-center rounded-full border-2 bg-background text-[10px] font-bold"
                    style={{ borderColor: by.color, color: by.color }}
                  >
                    {by.initial}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
