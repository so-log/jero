"use client";

import Link from "next/link";
import { useMemo } from "react";

import { TripMap } from "@/components/map";
import { Presence } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import {
  ItineraryPanel,
  deriveDays,
  placesForDay,
  toScheduledMarkers,
  usePlanStore,
} from "@/features/itinerary";
import { SystemPage } from "@/features/system";
import { formatPeriod, nightsDays } from "@/lib/tripDate";

import { useSharedTripQuery } from "../api/useSharedTripQuery";
import { SharePublicBar } from "./SharePublicBar";

/**
 * 08 뷰어 공유 — 공개 읽기 전용 뷰. 04의 ItineraryPanel + TripMap 을 **canEdit=false** 로 재사용(중복 구현 금지).
 * 비로그인 열람. 토큰 스코프·만료는 서버가 최종 강제(§8.2) — 여기 검증은 표시 분기일 뿐.
 */
export function SharedTripView({ token }: { token: string }) {
  const { data: result, isLoading } = useSharedTripQuery(token);
  const { activeDay, filterToday, activeCategory, selectedId, select } =
    usePlanStore();

  const snapshot = result?.ok ? result.snapshot : undefined;

  const days = useMemo(
    () =>
      snapshot ? deriveDays(snapshot.trip.start_date, snapshot.trip.end_date) : [],
    [snapshot],
  );
  const activeDate = days[activeDay]?.date;
  const dayPlaces = useMemo(
    () => (snapshot && activeDate ? placesForDay(snapshot.places, activeDate) : []),
    [snapshot, activeDate],
  );
  const scheduledMarkers = useMemo(() => toScheduledMarkers(dayPlaces), [dayPlaces]);

  // 무효/만료 토큰 → 11 시스템 페이지로 통일(일반화 메시지, 토큰/여행 존재 비노출 §8.5).
  if (result && !result.ok) {
    return (
      <SystemPage
        variant="404"
        code="만료된 링크"
        title="링크를 열 수 없어요"
        description="이 공유 링크는 만료되었거나 비활성화되었어요. 여행을 만든 분에게 새 링크를 요청해 주세요."
        actions={[
          { label: "홈으로", icon: "home", kind: "secondary", to: "/" },
          { label: "제이로 시작하기", icon: "arrow-right", kind: "primary", to: "/" },
        ]}
      />
    );
  }

  const panelLoading = isLoading || !snapshot;

  return (
    <div className="flex h-screen flex-col">
      <SharePublicBar />

      {/* 읽기 전용 안내 배너 */}
      <div className="flex flex-none items-center justify-between gap-4 border-b border-primary-tint bg-primary-wash px-5 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-[30px] flex-none items-center justify-center rounded-md bg-primary-tint text-primary-hover">
            <Icon name="eye" size={16} strokeWidth={2} />
          </span>
          <span className="text-[13.5px] font-semibold text-body">
            읽기 전용으로 보는 중이에요. 편집하려면 로그인이 필요해요.
          </span>
        </div>
        <Link
          href="/"
          className="inline-flex h-[34px] flex-none items-center gap-1.5 rounded-md bg-primary px-3.5 text-[13px] font-bold text-primary-foreground shadow-primary hover:bg-primary-hover"
        >
          <Icon name="pencil" size={15} strokeWidth={2.2} />
          로그인하고 편집하기
        </Link>
      </div>

      {/* 여행 헤더 */}
      <div className="flex flex-none items-center gap-3.5 border-b border-line px-5 py-4">
        <span className="flex size-12 flex-none items-center justify-center rounded-lg bg-gradient-to-br from-[#6E9CF2] to-[#8FBCF7] text-white shadow-[0_4px_10px_-2px_color-mix(in_srgb,#5B8DEF_50%,transparent)]">
          <Icon name="map-pin" size={24} strokeWidth={2.1} />
        </span>
        {snapshot ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-xl font-extrabold tracking-tight text-ink">
              {snapshot.trip.title}
            </span>
            <div className="flex items-center gap-1.5 text-[13px] font-medium text-faint">
              <Icon name="calendar" size={14} strokeWidth={2} />
              {formatPeriod(snapshot.trip.start_date, snapshot.trip.end_date)}
              <span className="rounded-pill bg-canvas px-2 py-px text-xs font-semibold text-subtle">
                {nightsDays(snapshot.trip.start_date, snapshot.trip.end_date).label}
              </span>
            </div>
          </div>
        ) : (
          <div className="h-9 w-48 animate-pulse rounded-md bg-secondary" />
        )}
        {snapshot && (
          <div className="ml-auto flex items-center gap-2.5">
            <span className="text-xs font-semibold text-faint">함께하는 사람</span>
            <Presence members={snapshot.members} size={30} />
          </div>
        )}
      </div>

      {/* 본문: 일정(읽기 전용) + 지도 */}
      <div className="flex min-h-0 flex-1">
        <ItineraryPanel
          days={days}
          dayPlaces={dayPlaces}
          isLoading={panelLoading}
          canEdit={false}
        />
        <div className="relative min-w-0 flex-1 bg-canvas">
          <TripMap
            scheduled={scheduledMarkers}
            saved={[]}
            filterToday={filterToday}
            selectedId={selectedId}
            activeCategory={activeCategory}
            onSelect={select}
            routeStyle="solid"
          />
        </div>
      </div>

      {/* 워터마크 */}
      <div className="flex flex-none items-center justify-center border-t border-line bg-surface py-2.5 text-xs font-medium text-faint">
        제이로에서 만든 여행 일정 · 누구나 무료로 만들 수 있어요
      </div>
    </div>
  );
}
