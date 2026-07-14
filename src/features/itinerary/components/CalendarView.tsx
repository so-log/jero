"use client";

import { useEffect, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { canEdit as roleCanEdit } from "@/lib/constants/roles";

import { useMembersQuery, usePlacesQuery } from "../api/usePlacesQuery";
import {
  addDays,
  addMonths,
  buildMonthGrid,
  buildWeekDays,
  dayLabel,
  monthLabel,
  placesByDate,
  weekLabel,
} from "../lib/calendar";
import { useCalendarStore } from "../store/calendarStore";
import { useSelectionStore } from "../store/selectionStore";
import type { PlaceDto } from "../types";
import { CalendarToolbar } from "./CalendarToolbar";
import { DayTimeline } from "./DayTimeline";
import { MonthGrid } from "./MonthGrid";
import { WeekTimeline } from "./WeekTimeline";

/**
 * 05 일정표 — 04와 같은 usePlacesQuery 소스를 월/주/일 시간 축으로 투영(설계 §6). 별도 fetch 없음(§7.1).
 * 공통 셸(상단 바)은 WorkspaceShell 이 제공하고, 이 뷰는 툴바 + 본문만 채운다.
 */
export function CalendarView({ tripId }: { tripId: string }) {
  const { data, isLoading } = usePlacesQuery(tripId);
  const { data: members = [] } = useMembersQuery(tripId);
  const { mode, cursorDate, setMode, setCursor } = useCalendarStore();

  const tripStart = data?.trip.start_date ?? "";
  const tripEnd = data?.trip.end_date ?? "";
  const cursor = cursorDate ?? tripStart;

  // B5 — 공유 선택 날짜 동기화(getState 비교로 핑퐁 방지).
  const selectedDate = useSelectionStore((s) => s.selectedDate);
  // 공유 날짜 → 캘린더 커서 채택(플랜에서 보던 날짜 유지).
  useEffect(() => {
    if (selectedDate && selectedDate !== useCalendarStore.getState().cursorDate) {
      setCursor(selectedDate);
    }
  }, [selectedDate, setCursor]);
  // 커서가 트립 내 날짜면 공유 소스에 발행(왕복 유지). 트립 밖(월 이동 등)은 발행 안 함.
  useEffect(() => {
    if (
      cursorDate &&
      cursorDate >= tripStart &&
      cursorDate <= tripEnd &&
      cursorDate !== useSelectionStore.getState().selectedDate
    ) {
      useSelectionStore.getState().setSelectedDate(cursorDate);
    }
  }, [cursorDate, tripStart, tripEnd]);

  const byDate = useMemo<Map<string, PlaceDto[]>>(
    () => (data ? placesByDate(data.places) : new Map()),
    [data],
  );

  const canEdit = data ? roleCanEdit(data.trip.my_role) : false;

  const rangeLabel =
    mode === "month"
      ? monthLabel(cursor)
      : mode === "week"
        ? weekLabel(cursor)
        : dayLabel(cursor);

  const onPrev = () =>
    setCursor(
      mode === "month"
        ? addMonths(cursor, -1)
        : addDays(cursor, mode === "week" ? -7 : -1),
    );
  const onNext = () =>
    setCursor(
      mode === "month"
        ? addMonths(cursor, 1)
        : addDays(cursor, mode === "week" ? 7 : 1),
    );
  const onToday = () => setCursor(tripStart);

  const dayPlaces = byDate.get(cursor) ?? [];
  const showDayEmpty = mode === "day" && dayPlaces.length === 0;

  return (
    <div className="flex h-full w-full flex-col bg-surface">
      <CalendarToolbar
        rangeLabel={rangeLabel}
        mode={mode}
        canEdit={canEdit}
        onPrev={onPrev}
        onToday={onToday}
        onNext={onNext}
        onModeChange={setMode}
      />

      {isLoading || !data ? (
        <div className="flex-1 p-[20px_22px]">
          <CalendarSkeleton />
        </div>
      ) : showDayEmpty ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon="calendar"
            title="이 날은 아직 일정이 없어요"
            description="시간과 장소를 더해 하루를 채워보세요. 추가하면 플랜 지도에도 동선이 그려져요."
            action={
              canEdit ? (
                <Button variant="primary" size="lg" className="gap-2">
                  <Icon name="plus" size={20} strokeWidth={2.3} />
                  일정 추가하기
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : mode === "month" ? (
        <div className="min-h-0 flex-1 p-[16px_22px_20px]">
          <MonthGrid
            weeks={buildMonthGrid(cursor, byDate, tripStart, tripEnd)}
            selected={cursor}
            onSelectDate={(date, isTrip) => {
              setCursor(date);
              if (isTrip) setMode("day");
            }}
          />
        </div>
      ) : mode === "week" ? (
        <div className="min-h-0 flex-1 p-[14px_22px_18px]">
          <WeekTimeline
            days={buildWeekDays(cursor)}
            byDate={byDate}
            selected={cursor}
            tripStart={tripStart}
            tripEnd={tripEnd}
          />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto py-1.5 pb-[22px]">
          <DayTimeline places={dayPlaces} members={members} />
        </div>
      )}
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="flex h-full flex-col gap-2 rounded-panel border border-line bg-background p-4">
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-3.5 rounded-md bg-secondary" />
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7 grid-rows-5 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-md bg-secondary" />
        ))}
      </div>
    </div>
  );
}
