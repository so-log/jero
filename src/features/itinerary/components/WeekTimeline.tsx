"use client";

import { CATEGORY } from "@/lib/constants/category";
import { cn } from "@/lib/utils";

import {
  TIMELINE,
  timeToHours,
  weekdayKR,
  type PlaceDtoBlock,
} from "../lib/calendar";
import type { PlaceDto } from "../types";

/**
 * 주 모드 — 7일 타임라인(08–20). 시작 시각·소요 시간 기준 이벤트 블록(카테고리 좌측 보더). 시안 buildWeek.
 * 여행 기간 외 날짜는 흐림.
 */
interface WeekTimelineProps {
  days: string[];
  byDate: Map<string, PlaceDto[]>;
  selected: string;
  tripStart: string;
  tripEnd: string;
}

const { startH, endH, hourH } = TIMELINE;
const gridH = (endH - startH) * hourH;

export function WeekTimeline({
  days,
  byDate,
  selected,
  tripStart,
  tripEnd,
}: WeekTimelineProps) {
  const hourLabels = Array.from({ length: endH - startH }, (_, i) => startH + i);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-panel border border-line bg-background shadow-card">
      {/* 요일 헤더 */}
      <div className="flex border-b border-line">
        <div className="w-[52px] flex-none" />
        {days.map((iso) => {
          const isTrip = iso >= tripStart && iso <= tripEnd;
          const isSel = iso === selected;
          const day = Number(iso.split("-")[2]);
          return (
            <div key={iso} className="flex-1 py-2 text-center">
              <div
                className={cn(
                  "text-[11px] font-bold",
                  isTrip ? "text-subtle" : "text-mute",
                )}
              >
                {weekdayKR(iso)}
              </div>
              <div
                className={cn(
                  "mx-auto mt-0.5 flex size-7 items-center justify-center rounded-full text-sm",
                  isSel
                    ? "bg-primary font-extrabold text-white"
                    : isTrip
                      ? "font-bold text-ink"
                      : "font-bold text-mute",
                )}
              >
                {day}
              </div>
            </div>
          );
        })}
      </div>

      {/* 타임라인 본문 */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex">
          <div
            className="relative w-[52px] flex-none"
            style={{ height: gridH }}
          >
            {hourLabels.map((h) => (
              <div
                key={h}
                className="absolute right-2 text-[10.5px] font-semibold text-mute"
                style={{ top: (h - startH) * hourH - 7 }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>
          {days.map((iso) => {
            const isTrip = iso >= tripStart && iso <= tripEnd;
            const blocks = toBlocks(byDate.get(iso) ?? []);
            return (
              <div
                key={iso}
                className={cn(
                  "relative flex-1 border-l border-line",
                  !isTrip && "bg-secondary/50",
                )}
                style={{
                  height: gridH,
                  backgroundImage:
                    "linear-gradient(var(--color-line) 1px, transparent 1px)",
                  backgroundSize: `100% ${hourH}px`,
                }}
              >
                {blocks.map((b) => {
                  const c = CATEGORY[b.place.category];
                  return (
                    <button
                      key={b.place.id}
                      type="button"
                      className="absolute right-[3px] left-[3px] overflow-hidden rounded-[4px_7px_7px_4px] px-1.5 py-1 text-left"
                      style={{
                        top: b.top,
                        height: b.height,
                        background: c.bg,
                        borderLeft: `3px solid ${c.fg}`,
                      }}
                    >
                      <div
                        className="text-[10px] font-bold"
                        style={{ color: c.fg }}
                      >
                        {b.place.start_time}
                      </div>
                      <div className="truncate text-[11px] font-semibold text-ink">
                        {b.place.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** 일정 → 블록 위치/높이(px). 시각 없으면 제외. */
function toBlocks(places: PlaceDto[]): PlaceDtoBlock[] {
  return places
    .map((place) => {
      const start = timeToHours(place.start_time);
      if (start == null) return null;
      const dur = (place.duration_min ?? 60) / 60;
      return {
        place,
        top: (start - startH) * hourH,
        height: Math.max(dur * hourH - 3, 26),
      };
    })
    .filter((b): b is PlaceDtoBlock => b !== null);
}
