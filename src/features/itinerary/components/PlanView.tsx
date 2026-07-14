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
import {
  deriveDays,
  peersToCursors,
  placesForDay,
  toSavedMarkers,
  toScheduledMarkers,
} from "../lib/selectors";
import { usePlanStore } from "../store/planStore";
import { useSelectionStore } from "../store/selectionStore";
import { ItineraryPanel } from "./ItineraryPanel";
import { MobilePlanControls, type PlanMode } from "./MobilePlanControls";

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

  // B5 — 플랜/캘린더 선택 날짜 동기화. getState 로 비교해 핑퐁(무한 갱신) 방지.
  const selectedDate = useSelectionStore((s) => s.selectedDate);
  // 플랜 활성 날짜 → 공유 소스에 발행.
  useEffect(() => {
    const d = days[activeDay]?.date;
    if (d && d !== useSelectionStore.getState().selectedDate) {
      useSelectionStore.getState().setSelectedDate(d);
    }
  }, [activeDay, days]);
  // 캘린더에서 고른 날짜(트립 내) 채택.
  useEffect(() => {
    if (!selectedDate || days.length === 0) return;
    const i = days.findIndex((d) => d.date === selectedDate);
    if (i >= 0 && i !== usePlanStore.getState().activeDay) {
      usePlanStore.getState().setActiveDay(i);
    }
  }, [selectedDate, days]);

  const dayPlaces = useMemo(
    () => (data && activeDate ? placesForDay(data.places, activeDate) : []),
    [data, activeDate],
  );
  const scheduledMarkers = useMemo(
    () => toScheduledMarkers(dayPlaces),
    [dayPlaces],
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
        onDayChange={setActiveDay}
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
          dayPlaces={dayPlaces}
          isLoading={isLoading}
          canEdit={canEdit}
          onReorder={onReorder}
          onUnassign={
            canEdit ? (placeId) => unassignPlace.mutate(placeId) : undefined
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
