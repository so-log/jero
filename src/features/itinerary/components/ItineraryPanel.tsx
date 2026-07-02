"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { useOverlayStore } from "@/store/overlayStore";

import { usePlanStore } from "../store/planStore";
import type { Day, PlaceDto } from "../types";
import { filterByCategory } from "../lib/selectors";
import { CategoryBar } from "./CategoryBar";
import { DaySwitcher } from "./DaySwitcher";
import { FilterTodayToggle } from "./FilterTodayToggle";
import { PlaceCard } from "./PlaceCard";
import { SortablePlaceItem } from "./SortablePlaceItem";

/**
 * 좌측 일정 패널 — 날짜 스위처 + (로딩/빈/메인). 시안 itinerary panel.
 * UI 상태(activeDay/filterToday/activeCategory/selectedId)는 planStore, 서버 데이터는 props(설계 §4).
 */
interface ItineraryPanelProps {
  days: Day[];
  /** 선택 날짜의 일정 장소(order_in_day 순, 미필터). */
  dayPlaces: PlaceDto[];
  isLoading: boolean;
  canEdit: boolean;
  /** 드래그 재정렬 → 해당 날 새 순서(id 배열)를 상위(PlanView)로 전달. canDrag 일 때만 활성. */
  onReorder?: (orderedIds: string[]) => void;
}

export function ItineraryPanel({
  days,
  dayPlaces,
  isLoading,
  canEdit,
  onReorder,
}: ItineraryPanelProps) {
  const {
    activeDay,
    activeCategory,
    selectedId,
    setActiveDay,
    filterToday,
    toggleFilterToday,
    setActiveCategory,
    select,
  } = usePlanStore();

  const openOverlay = useOverlayStore((s) => s.open);
  const dayLabel = days[activeDay]?.label ?? "";
  const list = filterByCategory(dayPlaces, activeCategory);
  const canDrag = canEdit && activeCategory === "all";

  // 드래그 센서: 포인터(클릭 오작동 방지 위해 5px 이동 후 활성) + 키보드(§11 비기능 "키보드 조작").
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = list.map((p) => p.id);
    const from = ids.indexOf(active.id as string);
    const to = ids.indexOf(over.id as string);
    if (from === -1 || to === -1) return;
    onReorder?.(arrayMove(ids, from, to));
  };

  return (
    <aside className="flex w-[392px] flex-none flex-col border-r border-line bg-surface">
      <div className="flex-none border-b border-line bg-background p-4">
        <DaySwitcher days={days} activeDay={activeDay} onSelect={setActiveDay} />
      </div>

      {isLoading ? (
        <PanelSkeleton />
      ) : dayPlaces.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-9 py-8">
          <EmptyState
            icon="map-pin"
            title="아직 등록된 장소가 없어요"
            description="장소를 추가하면 지도에 순서대로 동선이 그려져요. 첫 장소부터 함께 정해볼까요?"
            action={
              canEdit ? (
                <Button
                  variant="primary"
                  className="gap-1.5"
                  onClick={() => openOverlay("place")}
                >
                  <Icon name="plus" size={18} strokeWidth={2.3} />
                  장소 추가하기
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          <div className="flex flex-none flex-col gap-2.5 px-4 pt-3.5 pb-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-[15px] font-bold text-ink">
                  {dayLabel} 일정
                </span>
                <span className="text-[12.5px] font-semibold text-faint">
                  {dayPlaces.length}곳
                </span>
              </div>
              {canEdit && (
                <Button
                  variant="soft"
                  size="sm"
                  className="gap-1 pr-3 pl-2.5"
                  onClick={() => openOverlay("place")}
                >
                  <Icon name="plus" size={16} strokeWidth={2.3} />
                  장소 추가
                </Button>
              )}
            </div>
            <FilterTodayToggle checked={filterToday} onToggle={toggleFilterToday} />
            <CategoryBar active={activeCategory} onSelect={setActiveCategory} />
            {canDrag && (
              <div className="flex items-center gap-1.5 px-0.5 text-[11.5px] font-medium text-mute">
                <Icon name="grip-vertical" size={13} strokeWidth={2} />
                드래그해서 순서를 바꾸면 지도 동선도 함께 업데이트돼요
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 pt-0.5 pb-[18px]">
            {list.length === 0 ? (
              <p className="px-1 py-6 text-center text-[13px] text-faint">
                이 카테고리에 해당하는 장소가 없어요
              </p>
            ) : canDrag ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={list.map((p) => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="flex flex-col gap-2.5">
                    {list.map((place) => (
                      <SortablePlaceItem
                        key={place.id}
                        place={place}
                        order={dayPlaces.findIndex((p) => p.id === place.id) + 1}
                        selected={selectedId === place.id}
                        onSelect={select}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {list.map((place) => {
                  // 표시 순번은 해당 날 전체(dayPlaces) 기준 — 필터해도 원래 순서 유지.
                  const order =
                    dayPlaces.findIndex((p) => p.id === place.id) + 1;
                  return (
                    <li key={place.id}>
                      <PlaceCard
                        place={place}
                        order={order}
                        selected={selectedId === place.id}
                        muted={false}
                        canDrag={canDrag}
                        onSelect={select}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </aside>
  );
}

function PanelSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-2.5 p-4">
      <div className="h-[30px] w-3/5 animate-pulse rounded-md bg-secondary" />
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(
            "h-[68px] animate-pulse rounded-lg bg-secondary",
            i === 3 && "opacity-60",
          )}
        />
      ))}
    </div>
  );
}
