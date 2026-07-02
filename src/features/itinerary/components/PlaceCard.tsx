"use client";

import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from "@dnd-kit/core";
import type { KeyboardEvent } from "react";

import { CategoryTile } from "@/components/ui/category-chip";
import { Icon } from "@/components/ui/icon";
import { CATEGORY } from "@/lib/constants/category";
import { cn } from "@/lib/utils";

import type { PlaceDto } from "../types";

/**
 * 장소 카드 — 순번 + 카테고리 타일 + 이름 + 시간 + 카테고리 라벨 + 메모 + (편집) 드래그 핸들.
 * 시안 place card. 선택 시 좌측 강조 바(리스트↔지도 양방향 하이라이트).
 * order 는 표시 순번(1-based), place.order_in_day 와 별개로 셀렉터가 부여.
 *
 * 선택 영역은 role="button"(키보드 Enter/Space) — grip 을 실제 드래그 핸들(중첩 버튼)로 두기 위해
 * 루트를 button 이 아닌 div 로 둔다. dragHandleProps 가 있으면 grip 이 dnd-kit 활성화 노드가 된다.
 */
interface PlaceCardProps {
  place: PlaceDto;
  order: number;
  selected: boolean;
  muted: boolean;
  canDrag: boolean;
  onSelect: (id: string) => void;
  /**
   * dnd-kit 정렬 핸들 바인딩(정렬 가능 시). 셋이 함께 오면 grip 이 드래그 핸들이 된다.
   * ref 세터는 데이터(attributes·listeners)와 분리해 평면 prop 으로 받는다 — 콜백 ref 를 담은 객체의
   * 멤버 접근을 렌더 중 금지하는 react-hooks/refs 오탐을 피하기 위함(값 접근이 아니라 ref={} 로만 소비).
   */
  dragHandleRef?: (element: HTMLElement | null) => void;
  dragAttributes?: DraggableAttributes;
  dragListeners?: DraggableSyntheticListeners;
}

export function PlaceCard({
  place,
  order,
  selected,
  muted,
  canDrag,
  onSelect,
  dragHandleRef,
  dragAttributes,
  dragListeners,
}: PlaceCardProps) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(place.id);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={() => onSelect(place.id)}
      onKeyDown={onKeyDown}
      className={cn(
        "relative flex w-full cursor-pointer items-center gap-2.5 rounded-lg border bg-background py-2.5 pr-3 pl-3.5 text-left transition-all",
        "hover:-translate-y-px hover:border-line-strong hover:shadow-lift",
        selected ? "border-primary/40" : "border-line",
        muted && "opacity-45",
      )}
    >
      {selected && (
        <span className="absolute top-2.5 bottom-2.5 left-0 w-[3px] rounded-r-pill bg-primary" />
      )}
      <span className="flex size-[25px] flex-none items-center justify-center rounded-full bg-primary-tint text-[13px] font-bold text-primary-hover">
        {order}
      </span>
      <CategoryTile category={place.category} size={38} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[14.5px] font-semibold text-body">
          {place.name}
        </span>
        <div className="flex items-center gap-1.5 text-xs text-faint">
          {place.start_time && (
            <span className="inline-flex items-center gap-1">
              <Icon name="clock" size={12} strokeWidth={2} />
              {place.start_time}
            </span>
          )}
          {place.start_time && (
            <span className="size-[3px] rounded-full bg-mute" />
          )}
          <span className="rounded-pill bg-secondary px-2 py-0.5 text-[11px] font-semibold text-subtle">
            {CATEGORY[place.category].label}
          </span>
        </div>
        {place.memo && (
          <span className="truncate text-xs text-mute">{place.memo}</span>
        )}
      </div>
      {canDrag &&
        (dragHandleRef ? (
          <button
            type="button"
            ref={dragHandleRef}
            aria-label={`${order}번째 장소 순서 변경`}
            className="flex flex-none cursor-grab touch-none rounded-xs p-0.5 text-mute hover:text-subtle focus-visible:outline-2 focus-visible:outline-primary active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
            {...dragAttributes}
            {...dragListeners}
          >
            <Icon name="grip-vertical" size={18} strokeWidth={2} />
          </button>
        ) : (
          <span aria-hidden className="flex flex-none p-0.5 text-mute">
            <Icon name="grip-vertical" size={18} strokeWidth={2} />
          </span>
        ))}
    </div>
  );
}
