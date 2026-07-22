"use client";

import { cityColor } from "@/lib/constants/cityColors";
import { cn } from "@/lib/utils";

import type { CityView } from "../lib/citySelectors";

/**
 * 도시 전환 탭(다중 도시 Phase 3, 시안 §2 cityTabs) — 도시명·박수 pill. 활성 도시는 도시 색으로 채움.
 * 클릭 시 그 도시 첫날로 점프(상위에서 처리). scroll=true(모바일)면 가로 스크롤.
 * 색은 cityColors 팔레트를 인라인 style 로 소비(하드코딩 금지 — CATEGORY 와 같은 규약).
 */
interface CityTabsProps {
  cities: CityView[];
  activeCityId: string | null;
  onSelect: (cityId: string) => void;
  /** 모바일 가로 스크롤 배치. */
  scroll?: boolean;
}

export function CityTabs({
  cities,
  activeCityId,
  onSelect,
  scroll = false,
}: CityTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="도시 전환"
      className={cn(
        "flex gap-1.5",
        scroll && "overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
      )}
    >
      {cities.map((c) => {
        const on = c.id === activeCityId;
        const color = cityColor(c.seq);
        return (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onSelect(c.id)}
            style={
              on ? { background: color.color, borderColor: color.color } : undefined
            }
            className={cn(
              "inline-flex h-9 flex-none items-center gap-2 rounded-full border-[1.5px] px-3.5 transition-colors",
              on ? "text-white" : "border-line bg-background hover:bg-secondary",
            )}
          >
            <span
              className="size-2 flex-none rounded-full"
              style={{ background: on ? "#fff" : color.color }}
            />
            <span
              className={cn(
                "whitespace-nowrap text-[13px]",
                on ? "font-bold" : "font-semibold text-subtle",
              )}
            >
              {c.name}
            </span>
            <span
              className={cn(
                "text-[11.5px] font-semibold",
                on ? "text-white/80" : "text-faint",
              )}
            >
              {c.nights}박
            </span>
          </button>
        );
      })}
    </div>
  );
}
