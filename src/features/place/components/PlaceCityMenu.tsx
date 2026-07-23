"use client";

import { type MouseEvent, useState } from "react";

import { Icon } from "@/components/ui/icon";
import type { CityView } from "@/features/itinerary";
import { cityColor } from "@/lib/constants/cityColors";
import { cn } from "@/lib/utils";

/**
 * 장소 카드의 도시 칩 겸 이동 메뉴(다중 도시 Phase 4) — 현재 배정 도시를 색·이름 칩으로 보이고,
 * editor+ 면 칩 클릭으로 다른 도시(또는 미배정)로 즉시 이동(useMovePlaceCity, 낙관 갱신).
 * 읽기 전용(viewer)이면 정적 칩. 도시 축은 폴더·카테고리와 시각적으로 구분(색 점 = 도시).
 */
interface PlaceCityMenuProps {
  cities: CityView[];
  currentCityId: string | null | undefined;
  canEdit: boolean;
  onMove: (cityId: string | null) => void;
}

export function PlaceCityMenu({
  cities,
  currentCityId,
  canEdit,
  onMove,
}: PlaceCityMenuProps) {
  const [open, setOpen] = useState(false);
  const current = cities.find((c) => c.id === currentCityId) ?? null;
  const color = current ? cityColor(current.seq) : null;

  const label = current?.name ?? "미배정";

  // 정적 칩(viewer 또는 편집 불가) — 트리거 없이 표시만.
  const chip = (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="size-2 flex-none rounded-full"
        style={{ background: color?.color ?? "var(--color-mute)" }}
      />
      <span
        className="text-[11px] font-bold whitespace-nowrap"
        style={{ color: color?.color ?? "var(--color-mute)" }}
      >
        {label}
      </span>
    </span>
  );

  if (!canEdit) {
    return (
      <span className="inline-flex h-[22px] items-center rounded-pill border border-line bg-surface px-2">
        {chip}
      </span>
    );
  }

  const toggle = (e: MouseEvent) => {
    e.stopPropagation();
    setOpen((v) => !v);
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`도시 이동 (현재 ${label})`}
        onClick={toggle}
        className={cn(
          "inline-flex h-[22px] items-center gap-1 rounded-pill border px-2 transition-colors",
          open
            ? "border-primary bg-primary-wash"
            : "border-line bg-surface hover:bg-secondary",
        )}
      >
        {chip}
        <Icon name="chevron-down" size={12} strokeWidth={2.2} className="text-mute" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-10 cursor-default"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-[calc(100%+6px)] left-0 z-20 w-[172px] rounded-lg border border-line bg-popover p-1.5 shadow-modal"
          >
            <div className="px-2.5 pt-1 pb-1.5 text-[11px] font-bold text-faint">
              어느 도시의 장소인가요?
            </div>
            {cities.map((c) => {
              const cc = cityColor(c.seq);
              const on = c.id === currentCityId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!on) onMove(c.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex h-[34px] w-full items-center gap-2 rounded-md px-2.5 text-left hover:bg-secondary",
                    on && "bg-secondary",
                  )}
                >
                  <span
                    className="size-2.5 flex-none rounded-full"
                    style={{ background: cc.color }}
                  />
                  <span className="flex-1 truncate text-[13px] font-semibold text-body">
                    {c.name}
                  </span>
                  {on && (
                    <Icon
                      name="check"
                      size={14}
                      strokeWidth={2.6}
                      className="text-primary"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
