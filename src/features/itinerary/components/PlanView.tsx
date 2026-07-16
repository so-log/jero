"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { TripMap, type LatLng } from "@/components/map";
import { canEdit as roleCanEdit } from "@/lib/constants/roles";
import { cn } from "@/lib/utils";
import { throttle } from "@/lib/throttle";
import { useCursorStore } from "@/store/cursorStore";

import { useMembersQuery, usePlacesQuery } from "../api/usePlacesQuery";
import { useReorderPlaces } from "../api/useReorderPlaces";
import { useUnassignPlace } from "../api/useUnassignPlace";
import { useRouteOptimize } from "../hooks/useRouteOptimize";
import {
  deriveDays,
  orderByIds,
  peersToCursors,
  placesForDay,
  toSavedMarkers,
  toScheduledMarkers,
} from "../lib/selectors";
import { usePlanStore } from "../store/planStore";
import { useSelectionStore } from "../store/selectionStore";
import { ItineraryPanel } from "./ItineraryPanel";
import { MobilePlanControls, type PlanMode } from "./MobilePlanControls";
import { RouteOptimizeControls } from "./RouteOptimizeControls";

/** 커서 송신 throttle 주기(ms) — mousemove 폭주를 브로드캐스트 절감(2차 A). */
const CURSOR_THROTTLE_MS = 60;

/**
 * 04 플랜 뷰 — 좌측 일정 패널 + 우측 지도(동선·마커·실시간 커서)를 조립(설계 §3).
 * 서버상태=usePlacesQuery/useMembersQuery, UI 상태=planStore, 실시간 커서=cursorStore(useTripRealtime 송수신).
 * 지도 뷰모델은 순수 셀렉터로 투영. 컴포넌트 직접 fetch 금지(§7.1) — 데이터는 features/itinerary/api 경유.
 */
export function PlanView({ tripId }: { tripId: string }) {
  const { data, isLoading } = usePlacesQuery(tripId);
  const { data: members = [] } = useMembersQuery(tripId);

  const { activeDay, filterToday, activeCategory, selectedId, select, setActiveDay } =
    usePlanStore();

  // 모바일 전용: 리스트 ↔ 지도 토글(데스크톱은 2단이라 무관). 기본 리스트.
  const [mobileMode, setMobileMode] = useState<PlanMode>("list");

  const days = useMemo(
    () => (data ? deriveDays(data.trip.start_date, data.trip.end_date) : []),
    [data],
  );
  const activeDate = days[activeDay]?.date;

  // B5 — 플랜/캘린더 선택 날짜 동기화(단방향 채택 + 명시적 발행).
  // 발행을 effect 로 하면 date↔index 임피던스 차로 채택 effect 와 무한 핑퐁(setState depth) → 발행은 날짜 변경 핸들러에서만.
  const selectedDate = useSelectionStore((s) => s.selectedDate);
  // 캘린더/외부에서 고른 날짜(트립 내) → activeDay 채택.
  useEffect(() => {
    if (!selectedDate || days.length === 0) return;
    const i = days.findIndex((d) => d.date === selectedDate);
    if (i >= 0 && i !== usePlanStore.getState().activeDay) {
      usePlanStore.getState().setActiveDay(i);
    }
  }, [selectedDate, days]);
  // 플랜에서 Day 변경 시 activeDay + 공유 선택 날짜를 함께 갱신(캘린더가 따라옴).
  const selectDay = useCallback(
    (index: number) => {
      setActiveDay(index);
      const d = days[index]?.date;
      if (d) useSelectionStore.getState().setSelectedDate(d);
    },
    [setActiveDay, days],
  );

  const dayPlaces = useMemo(
    () => (data && activeDate ? placesForDay(data.places, activeDate) : []),
    [data, activeDate],
  );

  // 동선 최적화(2차) — 미리보기 중이면 제안 순서로 리스트·지도를 투영(순서 배열만 교체).
  const optimize = useRouteOptimize(tripId);
  const previewActive =
    optimize.preview !== null && optimize.preview.date === activeDate;
  const shownDayPlaces = useMemo(
    () =>
      previewActive && optimize.preview
        ? orderByIds(dayPlaces, optimize.preview.order)
        : dayPlaces,
    [previewActive, optimize.preview, dayPlaces],
  );

  const scheduledMarkers = useMemo(
    () => toScheduledMarkers(shownDayPlaces),
    [shownDayPlaces],
  );
  const savedMarkers = useMemo(
    () => (data ? toSavedMarkers(data.saved_places) : []),
    [data],
  );

  // 실시간 커서(2차 A): 피어 좌표(cursorStore) × 멤버(색·이름) → LiveCursor. 본인은 store 에서 제외됨.
  const peers = useCursorStore((s) => s.peers);
  const cursors = useMemo(() => peersToCursors(peers, members), [peers, members]);

  // 지도 mousemove → throttle 후 브로드캐스트(송신 transport 는 useTripRealtime 이 store 에 등록).
  const onPointerMove = useMemo(
    () =>
      throttle(
        (pos: LatLng) => useCursorStore.getState().send?.(pos.lat, pos.lng),
        CURSOR_THROTTLE_MS,
      ),
    [],
  );
  const onPointerLeave = useCallback(
    () => useCursorStore.getState().leave?.(),
    [],
  );

  const canEdit = data ? roleCanEdit(data.trip.my_role) : false;

  const reorder = useReorderPlaces(tripId);
  const onReorder = (orderedIds: string[]) => {
    if (activeDate) reorder.mutate({ date: activeDate, orderedIds });
  };

  const unassignPlace = useUnassignPlace(tripId);

  return (
    <div className="flex h-full min-h-0 w-full flex-col md:flex-row">
      {/* 모바일 전용: Day 스위처 + 리스트/지도 세그먼트(토글 위 고정) */}
      <MobilePlanControls
        days={days}
        activeDay={activeDay}
        onDayChange={selectDay}
        mode={mobileMode}
        onModeChange={setMobileMode}
      />

      {/* 리스트 패널 — 모바일: 리스트 모드일 때만 / 데스크톱: 항상 좌측 392px */}
      <div
        className={cn(
          "min-h-0",
          mobileMode === "list" ? "flex flex-1" : "hidden",
          "md:flex md:w-[392px] md:flex-none",
        )}
      >
        <ItineraryPanel
          days={days}
          dayPlaces={shownDayPlaces}
          isLoading={isLoading}
          canEdit={canEdit}
          onDayChange={selectDay}
          onReorder={onReorder}
          onUnassign={
            canEdit ? (placeId) => unassignPlace.mutate(placeId) : undefined
          }
          disableDrag={previewActive}
          routeControls={
            <RouteOptimizeControls
              canEdit={canEdit}
              coordCount={optimize.coordCount(dayPlaces)}
              previewing={previewActive}
              before={optimize.preview?.before ?? 0}
              after={optimize.preview?.after ?? 0}
              unit={optimize.preview?.unit ?? "km"}
              excludedCount={optimize.preview?.excludedCount ?? 0}
              fellBack={optimize.preview?.fellBack ?? false}
              isApplying={optimize.isApplying}
              isPreviewing={optimize.isPreviewing}
              mode={optimize.mode}
              onModeChange={optimize.setMode}
              anchorStart={optimize.anchorStart}
              anchorEnd={optimize.anchorEnd}
              onToggleStart={optimize.toggleAnchorStart}
              onToggleEnd={optimize.toggleAnchorEnd}
              canUndo={optimize.canUndo}
              onOptimize={() => {
                if (activeDate) void optimize.runPreview(activeDate, dayPlaces);
              }}
              onApply={optimize.apply}
              onCancel={optimize.cancel}
              onUndo={optimize.undo}
            />
          }
        />
      </div>

      {/* 지도 — 모바일: 지도 모드일 때만 / 데스크톱: 항상 우측 flex-1 */}
      <div
        className={cn(
          "relative min-w-0 bg-canvas",
          mobileMode === "map" ? "flex flex-1" : "hidden",
          "md:flex md:flex-1",
        )}
      >
        <TripMap
          scheduled={scheduledMarkers}
          saved={savedMarkers}
          filterToday={filterToday}
          selectedId={selectedId}
          activeCategory={activeCategory}
          cursors={cursors}
          routeStyle="solid"
          onSelect={select}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          emptyOverlay={
            <div className="max-w-[280px] rounded-2xl border-[1.5px] border-dashed border-mute bg-white/85 px-6 py-4 text-center text-[13px] font-semibold leading-relaxed text-subtle backdrop-blur">
              장소를 추가하면
              <br />
              여기에 순서대로 동선이 그려져요
            </div>
          }
        />
      </div>
    </div>
  );
}
