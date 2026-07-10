"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon, type IconName } from "@/components/ui/icon";
import type { Day, MemberDto, PlaceDto } from "@/features/itinerary";
import { cn } from "@/lib/utils";
import { useOverlayStore } from "@/store/overlayStore";

import { useAddPlaceToSchedule } from "../api/useAddPlaceToSchedule";
import { usePlacesStore } from "../store/placesStore";
import { SORT_LABEL, type SortKey } from "../types";
import { AddToScheduleMenu } from "./AddToScheduleMenu";
import { SavedPlaceCard } from "./SavedPlaceCard";

/**
 * 중앙 장소 리스트 — 헤더(폴더·개수·장소추가) + 검색/정렬 + 2열 카드 그리드(또는 빈/로딩). 시안 place list.
 * UI 상태(검색·정렬·선택)는 placesStore, 데이터는 props(설계 §4 분리).
 */
interface PlaceListProps {
  tripId: string;
  places: PlaceDto[];
  members: MemberDto[];
  days: Day[];
  folder: { name: string; icon: IconName; color: string };
  canEdit: boolean;
  isLoading: boolean;
}

export function PlaceList({
  tripId,
  places,
  members,
  days,
  folder,
  canEdit,
  isLoading,
}: PlaceListProps) {
  const { query, sort, selectedId, assigned, setQuery, setSort, select } =
    usePlacesStore();
  const { assign, unassign } = useAddPlaceToSchedule(tripId);
  const openOverlay = useOverlayStore((s) => s.open);
  const memberById = new Map(members.map((m) => [m.id, m]));

  const toggleSort = () =>
    setSort(sort === "recent" ? "name" : ("recent" as SortKey));

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {/* 헤더 */}
      <div className="flex flex-none flex-col gap-3 border-b border-line px-5 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className="flex size-[30px] flex-none items-center justify-center rounded-md bg-secondary"
              style={{ color: folder.color }}
            >
              <Icon name={folder.icon} size={17} strokeWidth={2} />
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-[17px] font-extrabold tracking-tight text-ink">
                {folder.name}
              </span>
              <span className="text-[13px] font-semibold text-faint">
                {places.length}곳
              </span>
            </div>
          </div>
          {canEdit && (
            <Button
              variant="primary"
              size="sm"
              className="gap-1.5 pr-4 pl-3"
              onClick={() => openOverlay("place")}
            >
              <Icon name="plus" size={17} strokeWidth={2.3} />
              장소 추가
            </Button>
          )}
        </div>
        {!isLoading && (
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 flex-1 items-center gap-2 rounded-md border border-transparent bg-secondary px-3 text-faint focus-within:border-primary/40 focus-within:bg-background">
              <Icon name="search" size={16} strokeWidth={2.2} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="저장한 장소 검색"
                className="min-w-0 flex-1 bg-transparent text-[13.5px] font-medium text-body outline-none placeholder:text-faint"
              />
            </div>
            <button
              type="button"
              onClick={toggleSort}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-line-strong bg-background pr-3 pl-3.5 text-[13px] font-semibold text-subtle hover:bg-secondary"
            >
              {SORT_LABEL[sort]}
              <Icon name="chevron-down" size={15} strokeWidth={2.2} className="text-mute" />
            </button>
          </div>
        )}
      </div>

      {/* 본문 */}
      {isLoading ? (
        <div className="grid flex-1 grid-cols-2 content-start gap-3.5 p-5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                "h-[132px] animate-pulse rounded-panel bg-secondary",
                i > 1 && "opacity-60",
              )}
            />
          ))}
        </div>
      ) : places.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8">
          {query.trim() ? (
            <p className="text-[13px] font-medium text-faint">
              검색 결과가 없어요
            </p>
          ) : (
            <EmptyState
              icon="bookmark"
              title="저장한 장소가 없어요"
              description="가고 싶은 곳을 폴더에 모아두세요. 나중에 날짜와 순서를 정해 일정으로 옮길 수 있어요."
              action={
                canEdit ? (
                  <Button
                    variant="primary"
                    className="gap-2"
                    onClick={() => openOverlay("place")}
                  >
                    <Icon name="plus" size={19} strokeWidth={2.3} />
                    장소 추가하기
                  </Button>
                ) : undefined
              }
            />
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3.5">
            {places.map((place) => (
              <SavedPlaceCard
                key={place.id}
                place={place}
                savedBy={place.saved_by ? memberById.get(place.saved_by) : undefined}
                selected={selectedId === place.id}
                onSelect={select}
                action={
                  <AddToScheduleMenu
                    days={days}
                    assignedDay={assigned[place.id] ?? null}
                    canEdit={canEdit}
                    onAssign={(day) => assign(place.id, day)}
                    onUnassign={() => unassign(place.id)}
                  />
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
