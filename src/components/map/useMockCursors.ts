"use client";

import { useMemo } from "react";

import { MEMBER_COLORS } from "@/lib/constants/members";

import type { LatLng, LiveCursor } from "./types";

/**
 * 실시간 커서 목 데이터 골격 — Supabase Realtime presence 연동 전(04 §11 "커서 후속"·§13).
 *
 * TODO(realtime): trip 단위 presence 채널로 교체.
 *   const ch = supabase.channel(`trip:${tripId}`, { config: { presence: { key: myId } } });
 *   ch.on('presence', { event: 'sync' }, () => {
 *     const state = ch.presenceState<{ memberId; color; lat; lng }>();
 *     setCursors(Object.values(state).flat().filter(p => p.memberId !== myId).map(toLiveCursor));
 *   });
 *   본인 포인터는 ch.track({ lat, lng }) 로 송출. 권한은 채널 구독 시 서버 검증(§8.2).
 *   실연동 시엔 외부 구독이므로 useState + useEffect(subscribe) 형태가 된다.
 *
 * 현재(목)는 (center, enabled)의 순수 파생이라 useMemo 로 둔다.
 */
export function useMockCursors(center: LatLng, enabled = true): LiveCursor[] {
  return useMemo<LiveCursor[]>(() => {
    if (!enabled) return [];
    // 목: 중심 근처 2명. 실연동 시 presence payload 로 대체된다.
    return [
      {
        id: "mock-cursor-1",
        name: "민준",
        color: MEMBER_COLORS[1],
        position: { lat: center.lat + 0.004, lng: center.lng - 0.006 },
      },
      {
        id: "mock-cursor-2",
        name: "서윤",
        color: MEMBER_COLORS[2],
        position: { lat: center.lat - 0.005, lng: center.lng + 0.003 },
      },
    ];
  }, [enabled, center.lat, center.lng]);
}
