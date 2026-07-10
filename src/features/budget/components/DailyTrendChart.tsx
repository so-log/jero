"use client";

import {
  Bar,
  BarChart,
  LabelList,
  ResponsiveContainer,
  XAxis,
} from "recharts";

import { useCssVar } from "@/lib/cssVar";
import { formatMan } from "@/lib/currency";

import type { DayTotal } from "../lib/budget";

/**
 * DailyTrend 의 Recharts 파트만 분리(코드 스플리팅 대상) — 부모가 next/dynamic 으로 지연 로드.
 * 카드 크롬·평균 표시는 부모(DailyTrend)가 즉시 렌더한다.
 */
export function DailyTrendChart({ data }: { data: DayTotal[] }) {
  const primary = useCssVar("--primary", "#3172e3");

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 24, right: 8, bottom: 4, left: 8 }}
        barCategoryGap="28%"
      >
        <defs>
          <linearGradient id="budgetBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={primary} stopOpacity={0.72} />
            <stop offset="100%" stopColor={primary} stopOpacity={1} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          interval={0}
          tick={(props) => <DayTick {...props} data={data} />}
          height={36}
        />
        <Bar
          dataKey="amountBase"
          fill="url(#budgetBar)"
          radius={[10, 10, 4, 4]}
          maxBarSize={56}
          isAnimationActive={false}
        >
          <LabelList dataKey="amountBase" content={<ManLabel />} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** X축 눈금 — 날짜 + 요일 2줄. */
function DayTick(props: {
  x?: number | string;
  y?: number | string;
  index?: number;
  payload?: { value: string };
  data: DayTotal[];
}) {
  const { x = 0, y = 0, index = 0, payload, data } = props;
  return (
    <g transform={`translate(${Number(x)}, ${Number(y)})`}>
      <text textAnchor="middle" dy={14} className="fill-body text-xs font-bold">
        {payload?.value}
      </text>
      <text
        textAnchor="middle"
        dy={28}
        className="fill-mute text-[10.5px] font-semibold"
      >
        {data[index]?.weekday}
      </text>
    </g>
  );
}

/** 막대 위 금액(만 단위) 라벨. */
function ManLabel(props: {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  value?: number | string;
}) {
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const width = Number(props.width ?? 0);
  const value = Number(props.value ?? 0);
  return (
    <text
      x={x + width / 2}
      y={y - 8}
      textAnchor="middle"
      className="fill-subtle text-xs font-bold"
    >
      {formatMan(value)}
    </text>
  );
}
