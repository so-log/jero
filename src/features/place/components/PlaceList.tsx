"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon, type IconName } from "@/components/ui/icon";
import type { CityView, Day, MemberDto, PlaceDto } from "@/features/itinerary";
import { cityColor } from "@/lib/constants/cityColors";
import { cn } from "@/lib/utils";
import { useOverlayStore } from "@/store/overlayStore";

import { useAddPlaceToSchedule } from "../api/useAddPlaceToSchedule";
import { useDeletePlace, useMovePlaceCity } from "../api/useUpsertPlace";
import { groupByCity } from "../lib/selectors";
import { usePlacesStore } from "../store/placesStore";
import { ALL_CITIES, SORT_LABEL, type SortKey } from "../types";
import { AddToScheduleMenu } from "./AddToScheduleMenu";
import { PlaceCityMenu } from "./PlaceCityMenu";
import { SavedPlaceCard } from "./SavedPlaceCard";

/**
 * 중앙 장소 리스트 — 헤더(폴더·개수·장소추가) + 검색/정렬 + 2열 카드 그리드(또는 빈/로딩). 시안 place list.
 * UI 상태(검색·정렬·선택)는 placesStore, 데이터는 props(설계 §4 분리).
 * 다중 도시(Phase 4): "전체 도시"면 도시별 그룹 섹션, 특정 도시면 그 도시만. 카드에 도시 칩·이동 메뉴.
 */
interface PlaceListProps {
  tripId: string;
  places: PlaceDto[];
  members: MemberDto[];
  days: Day[];
  folder: { name: string; icon: IconName; color: string };
  canEdit: boolean;
  isLoading: boolean;
  /** 도시 뷰모델(seq 순). 2개 이상이면 도시 축(칩·이동·그룹) 노출. 단일 도시면 [](회귀 0). */
  cities?: CityView[];
  /** 신규 "장소 추가" 기본 배정 도시(현재 보고 있는 도시). 없으면 미배정. */
  defaultCityId?: string | null;
}

export function PlaceList({
  tripId,
  places,
  members,
  days,
  folder,
  canEdit,
  isLoading,
  cities = [],
  defaultCityId = null,
}: PlaceListProps) {
  const { query, sort, cityId, selectedId, assigned, setQuery, setSort, select } =
    usePlacesStore();
  const { assign, unassign } = useAddPlaceToSchedule(tripId);
  const deletePlace = useDeletePlace(tripId);
  const moveCity = useMovePlaceCity(tripId);
  const openOverlay = useOverlayStore((s) => s.open);
  const memberById = new Map(members.map((m) => [m.id, m]));

  // 카드에서 바로 삭제(B9) — 확인 다이얼로그 후 useDeletePlace 재사용(오버레이 삭제와 동일 뮤테이션).
  const [pendingDelete, setPendingDelete] = useState<PlaceDto | null>(null);
  const confirmDelete = async () => {
    if (pendingDelete) await deletePlace.mutateAsync(pendingDelete.id);
    setPendingDelete(null);
  };

  const multiCity = cities.length > 1;
  // "전체 도시" 선택 + 다중 도시일 때만 도시별 그룹 섹션. 특정 도시면 평면 그리드.
  const grouped = multiCity && cityId === ALL_CITIES;

  // 카드 렌더(평면·그룹 공용) — 도시 칩/이동 메뉴는 다중 도시에서만 주입.
  const renderCard = (place: PlaceDto) => (
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
      onDelete={canEdit ? () => setPendingDelete(place) : undefined}
      cityBadge={
        multiCity ? (
          <PlaceCityMenu
            cities={cities}
            currentCityId={place.city_id}
            canEdit={canEdit}
            onMove={(toCity) =>
              moveCity.mutate({ placeId: place.id, cityId: toCity })
            }
          />
        ) : undefined
      }
    />
  );

  const toggleSort = () =>
    setSort(sort === "recent" ? "name" : ("recent" as SortKey));

  // "장소 추가" — 다중 도시면 현재 도시로 기본 배정(prefill.cityId). 단일 도시는 기존과 동일.
  const addPlace = () =>
    openOverlay(
      "place",
      defaultCityId != null ? { placePrefill: { cityId: defaultCityId } } : undefined,
    );

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
              onClick={addPlace}
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
                    onClick={addPlace}
                  >
                    <Icon name="plus" size={19} strokeWidth={2.3} />
                    장소 추가하기
                  </Button>
                ) : undefined
              }
            />
          )}
        </div>
      ) : grouped ? (
        // "전체 도시" — 도시별 그룹 섹션(seq 순, 빈 도시 제외, 미배정은 끝).
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex flex-col gap-5">
            {groupByCity(places, cities).map((g) => {
              const color = g.city ? cityColor(g.city.seq) : null;
              return (
                <section key={g.city?.id ?? "unassigned"}>
                  <div className="mb-2.5 flex items-center gap-2">
                    <span
                      className="size-2.5 flex-none rounded-full"
                      style={{ background: color?.color ?? "var(--color-mute)" }}
                    />
                    <span className="text-[13.5px] font-extrabold tracking-tight text-ink">
                      {g.city?.name ?? "도시 미배정"}
                    </span>
                    <span className="text-[12px] font-semibold text-faint">
                      {g.places.length}곳
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3.5">
                    {g.places.map(renderCard)}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3.5">{places.map(renderCard)}</div>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        variant="destructive"
        title="이 장소를 삭제할까요?"
        description="저장한 장소와 일정 배정이 함께 사라져요. 이 작업은 되돌릴 수 없어요."
        confirmLabel="삭제할게요"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
