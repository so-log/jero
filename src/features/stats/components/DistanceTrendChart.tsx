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
 * DistanceTrend 의 Recharts 파트만 분리(코드 스플리팅 대상) — 부모가 next/dynamic 으로 지연 로드.
 */
export function DistanceTrendChart({ data }: { data: DayDistance[] }) {
  const primary = useCssVar("--primary", "#3172e3");

  return (
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
