"use client";

import { useMemo } from "react";

import { ExpenseOverlay, useBudgetQuery } from "@/features/budget";
import {
  deriveDays,
  useCitySchedule,
  useMembersQuery,
  usePlacesQuery,
} from "@/features/itinerary";
import { PlaceDetailOverlay } from "@/features/place";
import { useTripQuery } from "@/features/trip";
import { useOverlayStore } from "@/store/overlayStore";

import { ShareOverlay } from "./ShareOverlay";

/**
 * 워크스페이스 오버레이 마운트(10) — overlayStore 의 active 에 따라 ①장소/②공유/③지출을 호출 뷰 위에 띄운다.
 * 데이터는 04~07과 동일 쿼리(usePlacesQuery·useMembersQuery·useTripQuery) 재사용 — 컴포넌트 직접 fetch 없음(§7.1).
 */
export function WorkspaceOverlays({ tripId }: { tripId: string }) {
  const { active, placeId, placePrefill, expenseId, close } = useOverlayStore();
  const { data } = usePlacesQuery(tripId);
  const { data: members = [] } = useMembersQuery(tripId);
  const { data: trip } = useTripQuery(tripId);
  const { data: budget } = useBudgetQuery(tripId);
  // 다중 도시(Phase 4) — 장소 오버레이 "도시" 필드용 뷰모델(단일 도시면 필드 자동 숨김).
  const { cityViews } = useCitySchedule(tripId, data?.trip.start_date);

  const days = useMemo(
    () => (data ? deriveDays(data.trip.start_date, data.trip.end_date) : []),
    [data],
  );
  const place = placeId
    ? [...(data?.places ?? []), ...(data?.saved_places ?? [])].find(
        (p) => p.id === placeId,
      )
    : undefined;

  if (active === "place") {
    return (
      <PlaceDetailOverlay
        open
        onClose={close}
        tripId={tripId}
        folders={data?.folders ?? []}
        place={place}
        prefill={placePrefill ?? undefined}
        cities={cityViews}
      />
    );
  }
  if (active === "share") {
    return (
      <ShareOverlay
        open
        onClose={close}
        tripId={tripId}
        members={members}
        myRole={trip?.my_role ?? "owner"}
      />
    );
  }
  if (active === "expense") {
    const expense = expenseId
      ? budget?.expenses.find((e) => e.id === expenseId)
      : undefined;
    return (
      <ExpenseOverlay
        open
        onClose={close}
        tripId={tripId}
        members={members}
        days={days}
        expense={expense}
      />
    );
  }
  return null;
}
