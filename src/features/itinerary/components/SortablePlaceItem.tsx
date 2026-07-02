"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { PlaceDto } from "../types";
import { PlaceCard } from "./PlaceCard";

/**
 * dnd-kit 정렬 아이템 래퍼 — `<li>` 를 정렬 노드로, PlaceCard 의 grip 을 활성화(핸들) 노드로 연결.
 * 드래그 중에는 살짝 띄우고(zIndex·shadow) 원본은 반투명 처리(시안 place card 흐름 유지, 토큰만 사용).
 */
interface SortablePlaceItemProps {
  place: PlaceDto;
  order: number;
  selected: boolean;
  onSelect: (id: string) => void;
}

export function SortablePlaceItem({
  place,
  order,
  selected,
  onSelect,
}: SortablePlaceItemProps) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: place.id });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
        position: "relative",
      }}
      className={isDragging ? "opacity-80 shadow-lift" : undefined}
    >
      <PlaceCard
        place={place}
        order={order}
        selected={selected}
        muted={false}
        canDrag
        onSelect={onSelect}
        dragHandleRef={setActivatorNodeRef}
        dragAttributes={attributes}
        dragListeners={listeners}
      />
    </li>
  );
}
