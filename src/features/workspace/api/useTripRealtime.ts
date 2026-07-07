"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/env";

/** heartbeat 주기(ms) — 이 간격마다 자기 접속을 broadcast. */
const HEARTBEAT_MS = 12_000;
/** 접속 TTL(ms) — 마지막 heartbeat 후 이 시간 지나면 오프라인 처리. */
const PRESENCE_TTL_MS = 30_000;
/** 만료 청소 주기(ms). */
const PRUNE_MS = 5_000;

/** broadcast 메시지에서 user id 를 안전하게 추출(형태 미보장 페이로드). */
function readId(msg: Record<string, unknown>): string | null {
  const p = msg.payload;
  if (p && typeof p === "object" && "id" in p) {
    const id = (p as { id: unknown }).id;
    return typeof id === "string" && id ? id : null;
  }
  return null;
}

/**
 * 워크스페이스 실시간(계약 B4). trip 단위 **private 채널**로:
 *  - presence(접속 멤버 → 상단바 "접속 중" 아바타): **broadcast heartbeat** 로 구현.
 *    네이티브 realtime presence(sync)가 이 프로젝트에서 미전달이라(track 은 ok, sync 이벤트 없음 —
 *    broadcast·postgres_changes 는 정상) broadcast 경로로 우회한다. 구독 시 + 주기적으로 자기 user id 를
 *    broadcast 하고, 피어는 수신 시각을 기록해 TTL 로 만료(이탈 시 bye + TTL 자연 정리). 실시간 커서 lat/lng 는 후속.
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
    let myId: string | null = null;
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const intervals: ReturnType<typeof setInterval>[] = [];

    // 접속 멤버(user id → 마지막 heartbeat 시각). TTL 로 만료해 onlineIds 산출.
    const seen = new Map<string, number>();
    const refreshOnline = () => {
      const now = Date.now();
      const alive: string[] = [];
      for (const [id, ts] of seen) {
        if (now - ts <= PRESENCE_TTL_MS) alive.push(id);
        else seen.delete(id);
      }
      setOnlineIds(alive);
    };

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
      // RLS(0004)를 통과해 구독된다. 없으면 CHANNEL_ERROR 로 broadcast·postgres_changes 미수신.
      await supabase.realtime.setAuth(session.access_token);
      if (cancelled) return;

      const uid = user.id;
      myId = uid;
      channel = supabase.channel(`trip:${tripId}`, {
        config: { private: true, broadcast: { self: true } },
      });

      const beat = () =>
        void channel?.send({
          type: "broadcast",
          event: "presence:hb",
          payload: { id: uid },
        });

      channel
        // presence heartbeat 수신 → 접속 집합 갱신.
        .on("broadcast", { event: "presence:hb" }, (msg) => {
          const id = readId(msg);
          if (id) {
            seen.set(id, Date.now());
            refreshOnline();
          }
        })
        // 이탈 알림 → 즉시 제거(TTL 보다 빠른 정리).
        .on("broadcast", { event: "presence:bye" }, (msg) => {
          const id = readId(msg);
          if (id) {
            seen.delete(id);
            refreshOnline();
          }
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
          if (status !== "SUBSCRIBED") return;
          seen.set(uid, Date.now()); // 본인도 "접속 중"에 포함
          refreshOnline();
          beat(); // 즉시 1회 알림(신규 접속자에게 자기 존재 통지 + 기존 접속자 유지)
          intervals.push(setInterval(beat, HEARTBEAT_MS));
          intervals.push(setInterval(refreshOnline, PRUNE_MS));
        });
    })();

    return () => {
      cancelled = true;
      for (const t of timers.values()) clearTimeout(t);
      for (const iv of intervals) clearInterval(iv);
      if (channel) {
        const ch = channel;
        void ch
          .send({ type: "broadcast", event: "presence:bye", payload: { id: myId ?? "" } })
          .finally(() => void supabase.removeChannel(ch));
      }
    };
  }, [tripId, queryClient]);

  return onlineIds;
}
