"use client";

import dynamic from "next/dynamic";

import { CATEGORY } from "@/lib/constants/category";
import { formatKRW } from "@/lib/currency";

import type { CategoryTotal } from "../lib/budget";

/**
 * 카테고리별 지출 도넛 + 범례(비중 %). Recharts 파트는 next/dynamic 으로 지연 로드(초기 번들 제외).
 * 카드·범례·중앙 라벨은 즉시 렌더 — 차트 영역만 고정 크기(140px) 스켈레톤 → 레이아웃 시프트 없음.
 */
const CategoryDonutChart = dynamic(
  () => import("./CategoryDonutChart").then((m) => m.CategoryDonutChart),
  {
    ssr: false,
    loading: () => (
      <div className="size-full animate-pulse rounded-full bg-secondary/60" />
    ),
  },
);

export function CategoryDonut({ data }: { data: CategoryTotal[] }) {
  const total = data.reduce((sum, d) => sum + d.amountBase, 0);

  return (
    <div className="flex flex-col gap-3.5 rounded-panel border border-line bg-background p-5 shadow-card">
      <div className="text-sm font-bold text-ink">카테고리별 지출</div>
      <div className="flex items-center gap-[18px]">
        <div className="relative size-[140px] flex-none">
          <CategoryDonutChart data={data} />
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5">
            <span className="text-[11px] font-semibold text-faint">총지출</span>
            <span className="text-[15.5px] font-extrabold tracking-tight text-ink">
              {formatKRW(total)}
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
              <span className="text-xs font-bold text-ink">{d.pct}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
