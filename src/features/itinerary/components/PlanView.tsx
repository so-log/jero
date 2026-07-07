"use client";

import { useMemo } from "react";

import {
  DEFAULT_CENTER,
  TripMap,
  useMockCursors,
  type LatLng,
} from "@/components/map";
import { canEdit as roleCanEdit } from "@/lib/constants/roles";

import { usePlacesQuery } from "../api/usePlacesQuery";
import { useReorderPlaces } from "../api/useReorderPlaces";
import { useUnassignPlace } from "../api/useUnassignPlace";
import {
  deriveDays,
  placesForDay,
  toSavedMarkers,
  toScheduledMarkers,
} from "../lib/selectors";
import { usePlanStore } from "../store/planStore";
import { ItineraryPanel } from "./ItineraryPanel";

/**
 * 04 플랜 뷰 — 좌측 일정 패널 + 우측 지도(동선·마커·커서)를 조립(설계 §3).
 * 서버상태=usePlacesQuery/useMembersQuery, UI 상태=planStore. 지도 뷰모델은 순수 셀렉터로 투영.
 * 컴포넌트 직접 fetch 금지(§7.1) — 데이터는 features/itinerary/api 경유.
 */
export function PlanView({ tripId }: { tripId: string }) {
  const { data, isLoading } = usePlacesQuery(tripId);

  const { activeDay, filterToday, activeCategory, selectedId, select } =
    usePlanStore();

  const days = useMemo(
    () => (data ? deriveDays(data.trip.start_date, data.trip.end_date) : []),
    [data],
  );
  const activeDate = days[activeDay]?.date;

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

  // 커서 목 중심 — 당일 마커 중심(없으면 도쿄 기본). presence 연동 시 교체(useMockCursors TODO).
  const center = useMemo<LatLng>(() => {
    if (scheduledMarkers.length === 0) return DEFAULT_CENTER;
    const sum = scheduledMarkers.reduce(
      (acc, m) => ({
        lat: acc.lat + m.position.lat,
        lng: acc.lng + m.position.lng,
      }),
      { lat: 0, lng: 0 },
    );
    return {
      lat: sum.lat / scheduledMarkers.length,
      lng: sum.lng / scheduledMarkers.length,
    };
  }, [scheduledMarkers]);
  const cursors = useMockCursors(center);

  const canEdit = data ? roleCanEdit(data.trip.my_role) : false;

  const reorder = useReorderPlaces(tripId);
  const onReorder = (orderedIds: string[]) => {
    if (activeDate) reorder.mutate({ date: activeDate, orderedIds });
  };

  const unassignPlace = useUnassignPlace(tripId);

  return (
    <div className="flex h-full min-h-0 w-full">
      <ItineraryPanel
        days={days}
        dayPlaces={dayPlaces}
        isLoading={isLoading}
        canEdit={canEdit}
        onReorder={onReorder}
        onUnassign={canEdit ? (placeId) => unassignPlace.mutate(placeId) : undefined}
      />
      <div className="relative min-w-0 flex-1 bg-canvas">
        <TripMap
          scheduled={scheduledMarkers}
          saved={savedMarkers}
          filterToday={filterToday}
          selectedId={selectedId}
          activeCategory={activeCategory}
          cursors={cursors}
          routeStyle="solid"
          onSelect={select}
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
