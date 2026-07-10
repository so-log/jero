"use client";

import { useMemo } from "react";

import { getPlaceDetails, reverseGeocode, TripMap } from "@/components/map";
import {
  deriveDays,
  useMembersQuery,
  usePlacesQuery,
} from "@/features/itinerary";
import { canEdit as roleCanEdit } from "@/lib/constants/roles";
import { useOverlayStore } from "@/store/overlayStore";

import {
  filterBySearch,
  placesInFolder,
  sortPlaces,
  toSavedMapMarkers,
} from "../lib/selectors";
import { useDeleteFolder, useUpsertFolder } from "../api/useFolders";
import { usePlacesStore } from "../store/placesStore";
import { ALL_FOLDER } from "../types";
import { FolderSidebar } from "./FolderSidebar";
import { PlaceList } from "./PlaceList";

/**
 * 06 장소 — 폴더 사이드바 + 저장 장소 리스트 + 미니 지도(3분할). 설계 §3.
 * 04와 동일 usePlacesQuery 소스(저장 장소=scheduled_date null)를 폴더/검색/정렬로 투영(§7.1 직접 fetch 없음).
 * 공통 셸(상단 바)은 WorkspaceShell 제공. "일정에 추가" 실제 배정은 스텁(useAddPlaceToSchedule).
 */
export function PlacesView({ tripId }: { tripId: string }) {
  const { data, isLoading } = usePlacesQuery(tripId);
  const { data: members = [] } = useMembersQuery(tripId);
  const { folderId, query, sort, selectedId, select, setFolder } =
    usePlacesStore();
  const upsertFolder = useUpsertFolder(tripId);
  const deleteFolder = useDeleteFolder(tripId);
  const openOverlay = useOverlayStore((s) => s.open);

  const saved = useMemo(() => data?.saved_places ?? [], [data]);
  const folders = data?.folders ?? [];
  const canEdit = data ? roleCanEdit(data.trip.my_role) : false;
  const days = useMemo(
    () => (data ? deriveDays(data.trip.start_date, data.trip.end_date) : []),
    [data],
  );

  // 지도 클릭 → "장소 추가" 프리필. POI 라벨(placeId) 클릭이면 이름·주소·좌표까지,
  // 빈 곳 클릭이면 reverse geocoding(좌표+주소, 이름 빈값).
  const onMapClick = canEdit
    ? async (position: { lat: number; lng: number }, placeId?: string) => {
        if (placeId) {
          const d = await getPlaceDetails(placeId);
          if (d) {
            openOverlay("place", {
              placePrefill: {
                name: d.name,
                address: d.address,
                lat: d.lat,
                lng: d.lng,
                googlePlaceId: d.placeId,
              },
            });
            return;
          }
          // 상세 조회 실패 → 좌표 기반 폴백(아래 공통 경로).
        }
        const geo = await reverseGeocode(position);
        openOverlay("place", {
          placePrefill: {
            address: geo?.address ?? "",
            lat: position.lat,
            lng: position.lng,
            googlePlaceId: geo?.placeId ?? null,
          },
        });
      }
    : undefined;

  // 폴더 → 검색 → 정렬: 리스트·지도가 공유하는 단일 가시 집합.
  const visible = useMemo(
    () => sortPlaces(filterBySearch(placesInFolder(saved, folderId), query), sort),
    [saved, folderId, query, sort],
  );
  const markers = useMemo(() => toSavedMapMarkers(visible), [visible]);

  const folderMeta =
    folderId === ALL_FOLDER
      ? { name: "전체 장소", icon: "layers" as const, color: "#5A606B" }
      : (() => {
          const f = folders.find((x) => x.id === folderId);
          return f
            ? { name: f.name, icon: f.icon, color: f.color }
            : { name: "전체 장소", icon: "layers" as const, color: "#5A606B" };
        })();

  return (
    <div className="flex h-full min-h-0 w-full">
      <FolderSidebar
        folders={folders}
        saved={saved}
        folderId={folderId}
        canEdit={canEdit}
        onSelect={setFolder}
        onCreateFolder={
          canEdit ? (name) => upsertFolder.mutate({ name }) : undefined
        }
        onRenameFolder={
          canEdit ? (id, name) => upsertFolder.mutate({ id, name }) : undefined
        }
        onDeleteFolder={
          canEdit
            ? (id) => {
                if (folderId === id) setFolder(ALL_FOLDER); // 활성 폴더 삭제 → 전체로
                deleteFolder.mutate(id);
              }
            : undefined
        }
      />
      <PlaceList
        tripId={tripId}
        places={visible}
        members={members}
        days={days}
        folder={folderMeta}
        canEdit={canEdit}
        isLoading={isLoading}
      />
      <div className="relative w-[356px] flex-none border-l border-line bg-canvas">
        <TripMap
          scheduled={[]}
          saved={markers}
          filterToday={false}
          selectedId={selectedId}
          onSelect={select}
          onMapClick={onMapClick}
          legend={
            <div className="absolute bottom-3.5 left-3.5 flex items-center gap-2 rounded-md border border-line bg-white/90 px-3 py-2 text-xs font-semibold text-subtle shadow-[0_4px_14px_-4px_color-mix(in_srgb,var(--color-ink)_16%,transparent)] backdrop-blur">
              <span
                className="size-[13px] border-[1.5px] border-line-strong bg-white"
                style={{ borderRadius: "50% 50% 50% 2px", transform: "rotate(45deg)" }}
              />
              저장한 장소 · 아직 일정 아님
            </div>
          }
          emptyOverlay={
            <div className="rounded-2xl border-[1.5px] border-dashed border-mute bg-white/85 px-5 py-4 text-center text-[12.5px] font-semibold leading-relaxed text-subtle backdrop-blur">
              저장한 장소가
              <br />
              여기에 표시돼요
            </div>
          }
        />
      </div>
    </div>
  );
}
