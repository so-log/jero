"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import { CATEGORY } from "@/lib/constants/category";
import { formatKRW } from "@/lib/currency";

import type { CategoryTotal } from "../lib/budget";

/**
 * 카테고리별 지출 도넛 + 범례(비중 %). Recharts PieChart. 색은 CATEGORY 단일 출처(fg).
 * 데이터(CategoryTotal[])는 셀렉터 결과만 받는다(차트는 계산하지 않음).
 */
export function CategoryDonut({ data }: { data: CategoryTotal[] }) {
  const total = data.reduce((sum, d) => sum + d.amountBase, 0);

  return (
    <div className="flex flex-col gap-3.5 rounded-panel border border-line bg-background p-5 shadow-card">
      <div className="text-sm font-bold text-ink">카테고리별 지출</div>
      <div className="flex items-center gap-[18px]">
        <div className="relative size-[140px] flex-none">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="amountBase"
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
