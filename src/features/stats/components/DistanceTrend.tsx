"use client";

import dynamic from "next/dynamic";

import type { DayDistance } from "../lib/stats";

/**
 * 일자별 이동거리 막대(2차 E). Recharts 파트는 next/dynamic 으로 지연 로드(초기 번들 제외).
 * 카드 크롬 즉시 렌더 — 차트 영역만 고정 높이(180px) 스켈레톤.
 */
const DistanceTrendChart = dynamic(
  () => import("./DistanceTrendChart").then((m) => m.DistanceTrendChart),
  {
    ssr: false,
    loading: () => (
      <div className="size-full animate-pulse rounded-md bg-secondary/60" />
    ),
  },
);

export function DistanceTrend({ data }: { data: DayDistance[] }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-panel border border-line bg-background p-5 shadow-card">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-ink">일자별 이동거리</div>
        <span className="text-xs font-semibold text-faint">직선 거리(km) 기준</span>
      </div>
      <div className="h-[180px] w-full">
        <DistanceTrendChart data={data} />
      </div>
    </div>
  );
}
