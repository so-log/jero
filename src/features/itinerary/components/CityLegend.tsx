"use client";

import { cityColor } from "@/lib/constants/cityColors";

import type { CityView } from "../lib/citySelectors";

/**
 * 캘린더 도시 범례(다중 도시 Phase 3, 시안 §3) — 도시별 점·이름·날짜 구간 칩.
 * 색은 cityColors 팔레트(인라인 style). wrap=true(모바일)면 칩을 감싸 배치.
 */
interface CityLegendProps {
  cities: CityView[];
  /** 모바일: 흰 칩(테두리)로 감싸 배치. 기본(데스크톱): 인라인 점·라벨. */
  chip?: boolean;
}

/** 'YYYY-MM-DD' → 'M.D'. */
function md(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${m}.${d}`;
}

export function CityLegend({ cities, chip = false }: CityLegendProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
      {cities.map((c) => {
        const color = cityColor(c.seq);
        return (
          <div
            key={c.id}
            className={
              chip
                ? "inline-flex items-center gap-1.5 rounded-full border border-line bg-background py-1 pr-2.5 pl-2"
                : "inline-flex items-center gap-1.5"
            }
          >
            <span
              className="size-2.5 flex-none rounded-full"
              style={{ background: color.color }}
            />
            <span className="text-[12.5px] font-bold text-body">{c.name}</span>
            <span className="text-[11.5px] font-semibold text-faint">
              {md(c.startDate)}–{md(c.endDate)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
