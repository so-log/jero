"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import { CATEGORY } from "@/lib/constants/category";

import type { CategoryStat } from "../lib/stats";

/**
 * CategoryPie 의 Recharts 파트만 분리(코드 스플리팅 대상) — 부모가 next/dynamic 으로 지연 로드.
 */
export function CategoryPieChart({ data }: { data: CategoryStat[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="category"
          cx="50%"
          cy="50%"
          innerRadius={48}
          outerRadius={70}
          startAngle={90}
          endAngle={-270}
          stroke="none"
          isAnimationActive={false}
        >
          {data.map((d) => (
            <Cell key={d.category} fill={CATEGORY[d.category].fg} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
