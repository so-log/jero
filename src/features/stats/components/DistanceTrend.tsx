"use client";

import {
  Bar,
  BarChart,
  LabelList,
  ResponsiveContainer,
  XAxis,
} from "recharts";

import { useCssVar } from "@/lib/cssVar";

import type { DayDistance } from "../lib/stats";

/**
 * 일자별 이동거리 막대(2차 E) — 예산 DailyTrend 톤. 막대 색은 --primary 토큰(런타임 해석).
 * 데이터(DayDistance[])는 셀렉터 결과만 받는다(차트는 계산하지 않음).
 */
export function DistanceTrend({ data }: { data: DayDistance[] }) {
  const primary = useCssVar("--primary", "#3172e3");

  return (
    <div className="flex flex-col gap-1.5 rounded-panel border border-line bg-background p-5 shadow-card">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-ink">일자별 이동거리</div>
        <span className="text-xs font-semibold text-faint">직선 거리(km) 기준</span>
      </div>
      <div className="h-[180px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 24, right: 8, bottom: 4, left: 8 }}
            barCategoryGap="28%"
          >
            <defs>
              <linearGradient id="distBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={primary} stopOpacity={0.72} />
                <stop offset="100%" stopColor={primary} stopOpacity={1} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              interval={0}
              height={24}
              tick={{ className: "fill-body text-xs font-bold" }}
            />
            <Bar
              dataKey="km"
              fill="url(#distBar)"
              radius={[10, 10, 4, 4]}
              maxBarSize={56}
              isAnimationActive={false}
            >
              <LabelList dataKey="km" content={<KmLabel />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** 막대 위 거리(km) 라벨. */
function KmLabel(props: {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  value?: number | string;
}) {
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const width = Number(props.width ?? 0);
  const value = Number(props.value ?? 0);
  if (value <= 0) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 8}
      textAnchor="middle"
      className="fill-subtle text-xs font-bold"
    >
      {value}km
    </text>
  );
}
