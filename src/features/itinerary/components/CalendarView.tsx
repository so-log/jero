"use client";

import { useEffect, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { cityForDate } from "@/features/trip";
import { cityColor } from "@/lib/constants/cityColors";
import { canEdit as roleCanEdit } from "@/lib/constants/roles";

import { useMembersQuery, usePlacesQuery } from "../api/usePlacesQuery";
import { useCitySchedule } from "../hooks/useCitySchedule";
import { cityForDay } from "../lib/citySelectors";
import {
  addDays,
  addMonths,
  buildMonthGrid,
  buildWeekDays,
  dayLabel,
  monthLabel,
  placesByDate,
  tripWeekStart,
  weekLabel,
} from "../lib/calendar";
import { useCalendarStore } from "../store/calendarStore";
import { useSelectionStore } from "../store/selectionStore";
import type { PlaceDto } from "../types";
import { CalendarToolbar } from "./CalendarToolbar";
import { CalendarWeekStrip } from "./CalendarWeekStrip";
import { CityDayBadge } from "./CityDayBadge";
import { CityLegend } from "./CityLegend";
import { CityTransferCard } from "./CityTransferCard";
import { DayTimeline } from "./DayTimeline";
import { MonthGrid, type MonthCityInfo } from "./MonthGrid";
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

  // 다중 도시(Phase 3) — 날짜 구간별 도시 색·라벨. isMulti(>1)에서만 노출(단일 도시 회귀 0).
  const { schedule, cityViews, isMulti } = useCitySchedule(tripId, tripStart);
  const monthCityOf = useMemo(() => {
    if (!isMulti) return undefined;
    return (date: string): MonthCityInfo | null => {
      const seg = cityForDate(schedule, date);
      if (!seg) return null;
      const c = cityColor(seg.seq);
      return {
        name: seg.name,
        color: c.color,
        tint: c.tint,
        isStart: seg.startDate === date,
      };
    };
  }, [isMulti, schedule]);
  const stripCityOf = useMemo(() => {
    if (!isMulti) return undefined;
    return (date: string) => {
      const seg = cityForDate(schedule, date);
      if (!seg) return null;
      const c = cityColor(seg.seq);
      return { color: c.color, tint: c.tint };
    };
  }, [isMulti, schedule]);
  const cursorDayCity = isMulti ? cityForDay(schedule, cursor) : null;

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

  // 모바일 7일 스트립(반응형 3-C) — cursor 가 속한 주(일~토), ‹ › 로 주 이동.
  // 로딩 중(cursor="")엔 계산 스킵 — 빈 문자열은 유효 날짜가 아니라 toISO 가 던진다.
  const mobileWeekStart = cursor && tripStart ? tripWeekStart(cursor, tripStart) : "";
  const stripDays = mobileWeekStart ? buildWeekDays(mobileWeekStart) : [];
  const onPrevWeek = () => setCursor(addDays(cursor, -7));
  const onNextWeek = () => setCursor(addDays(cursor, 7));

  const dayEmptyState = (
    <div className="flex flex-1 items-center justify-center px-8">
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
  );

  return (
    <div className="flex h-full w-full flex-col bg-surface">
      {/* 데스크톱(md+): 월/주/일 3모드 (기존 그대로) */}
      <div className="hidden min-h-0 flex-1 flex-col md:flex">
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
          dayEmptyState
        ) : mode === "month" ? (
          <div className="flex min-h-0 flex-1 flex-col gap-2.5 p-[16px_22px_20px]">
            {isMulti && (
              <div className="flex-none px-0.5">
                <CityLegend cities={cityViews} />
              </div>
            )}
            <div className="min-h-0 flex-1">
              <MonthGrid
                weeks={buildMonthGrid(cursor, byDate, tripStart, tripEnd)}
                selected={cursor}
                cityOf={monthCityOf}
                onSelectDate={(date, isTrip) => {
                  setCursor(date);
                  if (isTrip) setMode("day");
                }}
              />
            </div>
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
            {isMulti && (
              <CityTransferCard
                tripId={tripId}
                schedule={schedule}
                date={cursor}
                canEdit={canEdit}
                className="mx-[22px] mt-1.5 mb-1"
              />
            )}
            <DayTimeline places={dayPlaces} members={members} />
          </div>
        )}
      </div>

      {/* 모바일(<md): 7일 날짜 스트립 + 선택일 아젠다(데스크톱 일 보기 계승) */}
      <div className="flex min-h-0 flex-1 flex-col md:hidden">
        {isLoading || !data ? (
          <div className="flex-1 p-4">
            <CalendarSkeleton />
          </div>
        ) : (
          <>
            <div className="flex-none border-b border-line bg-background px-3 pt-2 pb-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  aria-label="이전 주"
                  onClick={onPrevWeek}
                  className="flex size-11 flex-none items-center justify-center rounded-xl text-subtle transition-colors hover:bg-secondary"
                >
                  <Icon name="chevron-left" size={20} strokeWidth={2.2} />
                </button>
                <span className="text-[14px] font-extrabold tracking-tight text-ink">
                  {weekLabel(mobileWeekStart)}
                </span>
                <button
                  type="button"
                  aria-label="다음 주"
                  onClick={onNextWeek}
                  className="flex size-11 flex-none items-center justify-center rounded-xl text-subtle transition-colors hover:bg-secondary"
                >
                  <Icon name="chevron-right" size={20} strokeWidth={2.2} />
                </button>
              </div>
              <div className="mt-1 px-1">
                <CalendarWeekStrip
                  days={stripDays}
                  selected={cursor}
                  byDate={byDate}
                  tripStart={tripStart}
                  tripEnd={tripEnd}
                  onSelect={setCursor}
                  cityOf={stripCityOf}
                />
              </div>
            </div>

            {isMulti && (
              <div className="flex-none border-b border-line bg-surface px-[22px] py-3">
                <CityLegend cities={cityViews} chip />
                {cursorDayCity && (
                  <div className="mt-2.5">
                    <CityDayBadge dayCity={cursorDayCity} date={cursor} />
                  </div>
                )}
                <CityTransferCard
                  tripId={tripId}
                  schedule={schedule}
                  date={cursor}
                  canEdit={canEdit}
                  className="mt-2.5"
                />
              </div>
            )}

            {dayPlaces.length === 0 ? (
              dayEmptyState
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto pb-[22px]">
                <div className="flex items-baseline gap-2 px-[22px] pt-4">
                  <span className="text-[15px] font-bold text-ink">
                    {dayLabel(cursor)}
                  </span>
                  <span className="text-[12.5px] font-semibold text-faint">
                    {dayPlaces.length}개 일정
                  </span>
                </div>
                <DayTimeline places={dayPlaces} members={members} />
              </div>
            )}
          </>
        )}
      </div>
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
