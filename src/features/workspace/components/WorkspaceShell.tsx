"use client";

import type { ReactNode } from "react";

import { useMembersQuery } from "@/features/itinerary";
import { useTripQuery } from "@/features/trip";
import { canEdit as roleCanEdit } from "@/lib/constants/roles";

import { useTripRealtime } from "../api/useTripRealtime";
import { WorkspaceMobileBar } from "./WorkspaceMobileBar";
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

  // 실시간: presence(접속) + 데이터 변경 동기화(계약 B4).
  // online = 실시간 presence ∪ 쿼리 기본(본인) — presence 없어도 본인은 접속 유지(감사 B).
  const onlineIds = useTripRealtime(tripId);
  const onlineSet = new Set(onlineIds);
  const membersWithPresence = members.map((m) => ({
    ...m,
    online: m.online || onlineSet.has(m.id),
  }));

  return (
    <div className="flex h-screen flex-col">
      {trip ? (
        <>
          {/* 데스크톱(md+): 인라인 탭 상단 바 */}
          <WorkspaceTopBar
            trip={trip}
            members={membersWithPresence}
            canEdit={canEdit}
          />
          {/* 모바일(<md): 햄버거 + 탭 드로어 상단 바 */}
          <WorkspaceMobileBar trip={trip} canEdit={canEdit} />
        </>
      ) : (
        <div className="h-14 flex-none border-b border-line bg-background md:h-[66px]" />
      )}
      <main className="flex min-h-0 flex-1">{children}</main>
      <WorkspaceOverlays tripId={tripId} />
    </div>
  );
}
