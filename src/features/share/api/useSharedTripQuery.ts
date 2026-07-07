import { useQuery } from "@tanstack/react-query";

import { MEMBERS_FIXTURE, PLAN_FIXTURE } from "@/features/itinerary";
import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/env";

import type { SharedTripResult } from "../types";

/**
 * 공유 토큰 조회 seam(08) — **익명** `get_shared_trip` RPC(계약 0003). 컴포넌트 직접 fetch 금지(§7.1).
 * 세션 없이 토큰 스코프 읽기 전용 스냅샷만(이메일·예산/정산·내부식별 제외, §8.5). 무효 사유는 일반화.
 * env 가드로 키 없으면 데모 스텁 유지.
 */
export function useSharedTripQuery(token: string) {
  return useQuery<SharedTripResult>({
    queryKey: ["share", token],
    retry: false,
    queryFn: async () => {
      if (!hasSupabase) {
        if (token === "expired") return { ok: false, reason: "expired" };
        if (token !== "demo" && token !== "tokyo-4d92x") {
          return { ok: false, reason: "invalid" };
        }
        return {
          ok: true,
          snapshot: {
            trip: {
              title: PLAN_FIXTURE.trip.title,
              start_date: PLAN_FIXTURE.trip.start_date,
              end_date: PLAN_FIXTURE.trip.end_date,
            },
            places: PLAN_FIXTURE.places,
            members: MEMBERS_FIXTURE.map((m) => ({
              initial: m.initial,
              color: m.color,
            })),
          },
        };
      }
      const { data, error } = await createClient().rpc("get_shared_trip", {
        p_token: token,
      });
      if (error || !data || typeof data !== "object" || !("ok" in data)) {
        return { ok: false, reason: "invalid" };
      }
      return data as SharedTripResult;
    },
  });
}
