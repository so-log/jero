"use client";

import { useMemo } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { usePlacesQuery } from "@/features/itinerary";

import { computeTripStats } from "../lib/stats";
import { CategoryPie } from "./CategoryPie";
import { DistanceTrend } from "./DistanceTrend";
import { StatCard } from "./StatCard";

/**
 * 통계 뷰(2차 E, ?view=stats) — 요약 카드 + 이동거리 막대 + 카테고리 도넛. 예산 대시보드(07) 톤.
 * 04~07과 동일 usePlacesQuery 단일 소스를 순수 셀렉터(computeTripStats)로 투영(§7.1 직접 fetch 없음).
 * 전 멤버(viewer 포함) 열람 — 편집 동작 없음. 서버 접근은 RLS(멤버)로 강제(§8.2).
 */
export function StatsView({ tripId }: { tripId: string }) {
  const { data, isLoading } = usePlacesQuery(tripId);

  const stats = useMemo(
    () => (data ? computeTripStats(data.places, data.trip) : null),
    [data],
  );

  // 이동거리 계산에서 제외된(좌표 없는) 일정 장소 수.
  const missingCoords = useMemo(
    () =>
      data
        ? data.places.filter((p) => p.lat === null || p.lng === null).length
        : 0,
    [data],
  );

  if (isLoading || !data || !stats) return <StatsSkeleton />;

  if (stats.placeCount === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface">
        <EmptyState
          icon="activity"
          title="아직 통계가 없어요"
          description="일정에 장소를 추가하면 이동거리와 카테고리 분포가 자동으로 집계돼요."
        />
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-surface">
      <div className="flex flex-col gap-4 p-6">
        {/* 요약 카드 4 */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            label="총 이동거리"
            value={`${stats.totalDistanceKm.toLocaleString("ko-KR")}km`}
            icon="route"
            tone="primary"
            sub={
              <span className="text-[11.5px] font-semibold text-faint">
                일정 좌표 직선 합
              </span>
            }
          />
          <StatCard
            label="총 장소"
            value={`${stats.placeCount}곳`}
            icon="map-pin"
            tone="success"
            sub={
              <span className="text-[11.5px] font-semibold text-faint">
                일정에 등록된 장소
              </span>
            }
          />
          <StatCard
            label="여행 일수"
            value={`${stats.tripDays}일`}
            icon="calendar"
            tone="violet"
          />
          <StatCard
            label="하루 평균 장소"
            value={`${stats.avgPerDay}곳`}
            icon="layers"
            tone="danger"
          />
        </div>

        {/* 차트 행 */}
        <div className="grid grid-cols-[1fr_420px] gap-4">
          <DistanceTrend data={stats.perDay} />
          <CategoryPie data={stats.byCategory} />
        </div>

        {/* 지역 분포(있을 때) */}
        {stats.byArea.length > 0 && (
          <div className="flex flex-col gap-3 rounded-panel border border-line bg-background p-5 shadow-card">
            <div className="text-sm font-bold text-ink">지역별 장소</div>
            <ul className="flex flex-col gap-2">
              {stats.byArea.map((a) => (
                <li key={a.area} className="flex items-center gap-3">
                  <span className="w-24 flex-none truncate text-[12.5px] font-semibold text-body">
                    {a.area}
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-pill bg-secondary">
                    <span
                      className="block h-full rounded-pill bg-primary"
                      style={{
                        width: `${Math.round((a.count / stats.placeCount) * 100)}%`,
                      }}
                    />
                  </span>
                  <span className="w-10 flex-none text-right text-xs font-bold text-subtle">
                    {a.count}곳
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {missingCoords > 0 && (
          <p className="px-1 text-[11.5px] font-medium text-faint">
            좌표가 없는 장소 {missingCoords}곳은 이동거리 계산에서 제외했어요.
          </p>
        )}
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="h-full w-full overflow-y-auto bg-surface">
      <div className="flex flex-col gap-4 p-6">
        <div className="grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[108px] animate-pulse rounded-panel bg-secondary" />
          ))}
        </div>
        <div className="grid grid-cols-[1fr_420px] gap-4">
          <div className="h-[240px] animate-pulse rounded-panel bg-secondary" />
          <div className="h-[240px] animate-pulse rounded-panel bg-secondary" />
        </div>
      </div>
    </div>
  );
}
