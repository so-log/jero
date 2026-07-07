"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/env";

/**
 * 워크스페이스 실시간(계약 B4). trip 단위 **private 채널**로:
 *  - presence: 접속 멤버(user id) → 상단바 "접속 중" 아바타. (실시간 커서 lat/lng 는 후속)
 *  - postgres_changes: place·expense·expense_split·trip_member 변경 → 해당 쿼리 invalidate(동기화)
 *  - 낙관적↔실시간 reconciliation: in-flight 뮤테이션 중엔 invalidate 를 미루고 settle 후 1회 재동기화(디바운스)
 * 접근제어: private 채널 + Realtime Authorization(realtime.messages RLS) → 비멤버 구독 차단(§8.2, 0004).
 * env 가드: 키 없으면 no-op(온라인 []). 컴포넌트 직접 fetch 금지(§7.1) — 훅으로 캡슐화.
 * 반환: 접속 중 user id 목록.
 */
export function useTripRealtime(tripId: string): string[] {
  const queryClient = useQueryClient();
  const [onlineIds, setOnlineIds] = useState<string[]>([]);

  useEffect(() => {
    if (!hasSupabase) return;
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const timers = new Map<string, ReturnType<typeof setTimeout>>();

    // 디바운스 invalidate + in-flight 가드(뮤테이션 중이면 settle 후로 미룸).
    const scheduleInvalidate = (queryKey: (string | number)[]) => {
      const k = JSON.stringify(queryKey);
      const t = timers.get(k);
      if (t) clearTimeout(t);
      timers.set(
        k,
        setTimeout(() => {
          if (queryClient.isMutating() > 0) {
            scheduleInvalidate(queryKey); // 낙관적 뮤테이션 진행 중 → 재시도(settle 대기)
            return;
          }
          void queryClient.invalidateQueries({ queryKey });
        }, 400),
      );
    };

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user || cancelled) return;

      // private 채널 Authorization: realtime 소켓에 사용자 JWT 를 실어야 realtime.messages
      // RLS(0004)를 통과해 구독된다. 없으면 CHANNEL_ERROR 로 presence·postgres_changes 미수신.
      await supabase.realtime.setAuth(session.access_token);
      if (cancelled) return;

      channel = supabase.channel(`trip:${tripId}`, {
        config: { private: true, presence: { key: user.id } },
      });

      channel
        .on("presence", { event: "sync" }, () => {
          if (channel) setOnlineIds(Object.keys(channel.presenceState()));
        })
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "place", filter: `trip_id=eq.${tripId}` },
          () => scheduleInvalidate(["places", tripId]),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "expense", filter: `trip_id=eq.${tripId}` },
          () => scheduleInvalidate(["budget", tripId]),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "expense_split" },
          () => scheduleInvalidate(["budget", tripId]),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "trip_member", filter: `trip_id=eq.${tripId}` },
          () => scheduleInvalidate(["members", tripId]),
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") void channel?.track({ online: true });
        });
    })();

    return () => {
      cancelled = true;
      for (const t of timers.values()) clearTimeout(t);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [tripId, queryClient]);

  return onlineIds;
}
