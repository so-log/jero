"use client";

import type { ReactNode } from "react";

import { CategoryTile } from "@/components/ui/category-chip";
import { Icon } from "@/components/ui/icon";
import type { MemberDto, PlaceDto } from "@/features/itinerary";
import { CATEGORY } from "@/lib/constants/category";
import { cn } from "@/lib/utils";

/**
 * 저장 장소 카드 — 카테고리 타일 + 이름 + 위치(area) + 카테고리 라벨 + 저장 멤버 + 메모 + 액션 슬롯. 시안 place card.
 * 선택 시 좌측 강조 바(리스트↔지도 양방향 하이라이트).
 */
interface SavedPlaceCardProps {
  place: PlaceDto;
  savedBy?: MemberDto;
  selected: boolean;
  onSelect: (id: string) => void;
  action: ReactNode;
  /** 삭제 액션(권한 있을 때만 주입) — 카드에서 바로 삭제(오버레이 안 열고). 없으면 삭제 버튼 미표시. */
  onDelete?: () => void;
}

export function SavedPlaceCard({
  place,
  savedBy,
  selected,
  onSelect,
  action,
  onDelete,
}: SavedPlaceCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={() => onSelect(place.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(place.id);
        }
      }}
      className={cn(
        "relative flex cursor-pointer flex-col gap-3 rounded-panel border bg-background p-3.5 transition-all",
        "hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift",
        selected ? "border-primary/40" : "border-line",
      )}
    >
      {selected && (
        <span className="absolute top-3.5 bottom-3.5 left-0 w-[3px] rounded-r-pill bg-primary" />
      )}
      <div className="flex items-start gap-2.5">
        <CategoryTile category={place.category} size={40} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[14.5px] font-bold text-body">
            {place.name}
          </span>
          <div className="flex items-center gap-1.5 text-xs font-medium text-faint">
            <Icon name="map-pin" size={12} strokeWidth={2} />
            <span className="truncate">{place.area}</span>
            <span className="size-[3px] flex-none rounded-full bg-mute" />
            <span className="flex-none rounded-pill bg-secondary px-1.5 py-px text-[11px] font-semibold text-subtle">
              {CATEGORY[place.category].label}
            </span>
          </div>
        </div>
        {savedBy && (
          <span
            title={`저장: ${savedBy.name}`}
            className="flex size-6 flex-none items-center justify-center rounded-full border-2 bg-background text-[10px] font-bold"
            style={{ borderColor: savedBy.color, color: savedBy.color }}
          >
            {savedBy.initial}
          </span>
        )}
      </div>

      {place.memo && (
        <div className="flex items-start gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1.5">
          <Icon
            name="pencil"
            size={13}
            strokeWidth={2}
            className="mt-px flex-none text-mute"
          />
          <span className="text-xs font-medium leading-snug text-subtle">
            {place.memo}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        {action}
        {onDelete && (
          <button
            type="button"
            aria-label={`${place.name} 삭제`}
            onClick={(e) => {
              e.stopPropagation(); // 카드 선택과 분리
              onDelete();
            }}
            className="flex size-8 flex-none items-center justify-center rounded-md text-mute transition-colors hover:bg-danger-tint hover:text-danger"
          >
            <Icon name="trash" size={16} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}
