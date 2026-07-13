"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { AppHeader } from "@/components/layout/AppHeader";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { useProfileQuery } from "@/features/account";
import { toISODate } from "@/lib/tripDate";

import {
  useSeedTripDetails,
  useTripsQuery,
} from "../api/useTripsQuery";
import {
  filterBySearch,
  groupTrips,
  tripsSummaryText,
} from "../lib/selectors";
import type { TripFilter } from "../types";
import { TripCard } from "./TripCard";

/**
 * 02 내 여행 목록 — 전역 헤더 + 예정/지난 그룹 카드 그리드(설계 §3). 컴포넌트 직접 fetch 금지(§7.1).
 * 필터는 URL(?tab=) 동기화(서버 page 가 prop 으로 전달), 검색은 클라 필터(§12).
 */
const FILTER_ITEMS = [
  { value: "upcoming", label: "예정" },
  { value: "past", label: "지난" },
  { value: "all", label: "전체" },
];

export function TripsHome({ tab }: { tab: TripFilter }) {
  const router = useRouter();
  const { data: trips, isLoading } = useTripsQuery();
  const { data: profile } = useProfileQuery();
  useSeedTripDetails(trips);

  // 실제 프로필 → 헤더. 로딩 중엔 undefined(중립 표시).
  const headerUser = profile
    ? { initial: profile.name.slice(0, 1), name: profile.name, color: profile.avatarColor }
    : undefined;

  const [search, setSearch] = useState("");
  const [today] = useState(() => toISODate(new Date()));

  const isEmpty = !isLoading && (trips?.length ?? 0) === 0;
  const groups = useMemo(() => {
    if (!trips) return [];
    return groupTrips(filterBySearch(trips, search), tab, today);
  }, [trips, search, tab, today]);

  const subtitle = isEmpty
    ? "함께 떠날 여행을 시작해 보세요"
    : trips
      ? tripsSummaryText(trips, today)
      : "";

  return (
    <div className="flex h-screen flex-col">
      <AppHeader search={search} onSearchChange={setSearch} user={headerUser} />

      <main className="flex min-h-0 flex-1 flex-col bg-surface">
        {/* page head */}
        <div className="flex flex-none flex-col gap-[18px] px-4 pt-[26px] sm:px-7">
          <div className="flex items-end justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-ink">
                내 여행
              </h1>
              <span className="text-[13.5px] font-medium text-faint">
                {subtitle}
              </span>
            </div>
            {!isEmpty && (
              <Link
                href="/trips/new"
                className={buttonVariants({ variant: "primary" })}
              >
                <Icon name="plus" size={18} strokeWidth={2.3} />
                새 여행 만들기
              </Link>
            )}
          </div>

          {!isEmpty && !isLoading && (
            <div className="flex items-center justify-between border-b border-line pb-3.5">
              <SegmentedTabs
                items={FILTER_ITEMS}
                value={tab}
                onValueChange={(v) => router.push(`/trips?tab=${v}`)}
                aria-label="여행 필터"
              />
              <Button variant="secondary" size="sm" className="gap-1.5 font-semibold">
                <Icon name="arrow-up-down" size={15} strokeWidth={2} className="text-faint" />
                최근 출발 순
                <Icon name="chevron-down" size={15} strokeWidth={2.2} className="text-mute" />
              </Button>
            </div>
          )}
        </div>

        {/* scroll area */}
        <div className="flex-1 overflow-y-auto px-4 pt-[22px] pb-7 sm:px-7">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-[244px] animate-pulse rounded-panel bg-secondary ${i > 2 ? "opacity-60" : ""}`}
                />
              ))}
            </div>
          ) : isEmpty ? (
            <div className="flex h-[480px] items-center justify-center">
              <EmptyState
                icon="map-pin"
                title="아직 떠날 여행이 없어요"
                description="첫 여행을 만들고 친구들을 초대해 보세요. 일정과 동선, 예산을 함께 정리할 수 있어요."
                action={
                  <Link
                    href="/trips/new"
                    className={buttonVariants({ variant: "primary", size: "lg" })}
                  >
                    <Icon name="plus" size={20} strokeWidth={2.3} />첫 여행 만들기
                  </Link>
                }
              />
            </div>
          ) : groups.length === 0 ? (
            <p className="py-16 text-center text-sm font-medium text-faint">
              조건에 맞는 여행이 없어요
            </p>
          ) : (
            <div className="flex flex-col gap-[26px]">
              {groups.map((group) => (
                <section key={group.key} className="flex flex-col gap-3.5">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-[13.5px] font-bold text-body">
                      {group.label}
                    </h2>
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-pill bg-canvas px-1.5 text-[11.5px] font-bold text-subtle">
                      {group.trips.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {group.trips.map((trip) => (
                      <TripCard key={trip.id} trip={trip} todayISO={today} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
