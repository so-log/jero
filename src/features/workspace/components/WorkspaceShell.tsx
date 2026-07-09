"use client";

import type { ReactNode } from "react";

import { useMembersQuery } from "@/features/itinerary";
import { useTripQuery } from "@/features/trip";
import { canEdit as roleCanEdit } from "@/lib/constants/roles";

import { useTripRealtime } from "../api/useTripRealtime";
import { WorkspaceOverlays } from "./WorkspaceOverlays";
import { WorkspaceTopBar } from "./WorkspaceTopBar";

/**
 * 워크스페이스 공통 셸(설계 §2) — 상단 바 + 본문 슬롯. 4뷰(플랜/일정표/장소/예산)가 공유.
 * trip·members 는 셸에서 한 번 조회(usePlacesQuery 단일 소스 — 본문 뷰도 같은 키로 캐시 공유).
 */
export function WorkspaceShell({
  tripId,
  children,
}: {
  tripId: string;
  children: ReactNode;
}) {
  const { data: trip } = useTripQuery(tripId);
  const { data: members = [] } = useMembersQuery(tripId);
  const canEdit = trip ? roleCanEdit(trip.my_role) : false;

  // 실시간: presence(접속) + 데이터 변경 동기화(계약 B4). online 은 presence 로 덮어쓴다.
  const onlineIds = useTripRealtime(tripId);
  const onlineSet = new Set(onlineIds);
  const membersWithPresence = members.map((m) => ({
    ...m,
    online: onlineSet.has(m.id),
  }));

  return (
    <div className="flex h-screen flex-col">
      {trip ? (
        <WorkspaceTopBar trip={trip} members={membersWithPresence} canEdit={canEdit} />
      ) : (
        <div className="h-[66px] flex-none border-b border-line bg-background" />
      )}
      <main className="flex min-h-0 flex-1">{children}</main>
      <WorkspaceOverlays tripId={tripId} />
    </div>
  );
}
