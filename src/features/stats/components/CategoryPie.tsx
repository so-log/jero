"use client";

import dynamic from "next/dynamic";

import { CATEGORY } from "@/lib/constants/category";

import type { CategoryStat } from "../lib/stats";

/**
 * 카테고리별 장소 분포 도넛 + 범례(2차 E). Recharts 파트는 next/dynamic 으로 지연 로드(초기 번들 제외).
 * 카드·범례·중앙 라벨 즉시 렌더 — 차트 영역만 고정 크기(140px) 스켈레톤.
 */
const CategoryPieChart = dynamic(
  () => import("./CategoryPieChart").then((m) => m.CategoryPieChart),
  {
    ssr: false,
    loading: () => (
      <div className="size-full animate-pulse rounded-full bg-secondary/60" />
    ),
  },
);

export function CategoryPie({ data }: { data: CategoryStat[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="flex flex-col gap-3.5 rounded-panel border border-line bg-background p-5 shadow-card">
      <div className="text-sm font-bold text-ink">카테고리별 장소</div>
      <div className="flex items-center gap-[18px]">
        <div className="relative size-[140px] flex-none">
          <CategoryPieChart data={data} />
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5">
            <span className="text-[11px] font-semibold text-faint">총 장소</span>
            <span className="text-[17px] font-extrabold tracking-tight text-ink">
              {total}곳
            </span>
          </div>
        </div>
        <ul className="flex flex-1 flex-col gap-2.5">
          {data.map((d) => (
            <li key={d.category} className="flex items-center gap-2">
              <span
                className="size-[9px] flex-none rounded-sm"
                style={{ background: CATEGORY[d.category].fg }}
              />
              <span className="flex-1 text-[12.5px] font-semibold text-body">
                {CATEGORY[d.category].label}
              </span>
              <span className="text-xs font-bold text-ink">
                {d.count}곳 · {d.pct}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
