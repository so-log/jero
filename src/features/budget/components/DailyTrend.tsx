"use client";

import dynamic from "next/dynamic";

import { formatKRW } from "@/lib/currency";

import type { DayTotal } from "../lib/budget";

/**
 * 일자별 지출 추이 막대 + 하루 평균. Recharts 파트는 next/dynamic 으로 지연 로드(초기 번들 제외).
 * 카드 크롬은 즉시 렌더 — 차트 영역만 고정 높이(180px) 스켈레톤 → 레이아웃 시프트 없음.
 */
const DailyTrendChart = dynamic(
  () => import("./DailyTrendChart").then((m) => m.DailyTrendChart),
  {
    ssr: false,
    loading: () => (
      <div className="size-full animate-pulse rounded-md bg-secondary/60" />
    ),
  },
);

export function DailyTrend({
  data,
  dailyAvg,
}: {
  data: DayTotal[];
  dailyAvg: number;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-panel border border-line bg-background p-5 shadow-card">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-ink">일자별 지출 추이</div>
        <span className="text-xs font-semibold text-faint">
          하루 평균 {formatKRW(dailyAvg)}
        </span>
      </div>
      <div className="h-[180px] w-full">
        <DailyTrendChart data={data} />
      </div>
    </div>
  );
}
