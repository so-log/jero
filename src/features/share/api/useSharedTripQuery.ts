import { useQuery } from "@tanstack/react-query";

import { MEMBERS_FIXTURE, PLAN_FIXTURE } from "@/features/itinerary";

import type { SharedTripResult } from "../types";

/**
 * 공유 토큰 조회 seam — 현재는 **스텁**(데모 토큰만 유효). 컴포넌트 직접 fetch 금지(§7.1).
 *
 * TODO(supabase): 인증 없는 공개 경로로 Edge/RLS 보안 뷰 조회.
 *   - 토큰 → 여행 읽기 전용 스코프만 응답(편집 API·다른 여행 차단, §8.2)
 *   - 토큰 만료·폐기 검증, 추측 불가 엔트로피(§8.2·§8.7)
 *   - 응답에서 이메일·예산/정산·내부 id 제외(§8.5) — 무효 사유는 일반화
 */
const VALID_TOKENS = new Set(["demo", "tokyo-4d92x"]);

export function useSharedTripQuery(token: string) {
  return useQuery<SharedTripResult>({
    queryKey: ["share", token],
    retry: false,
    queryFn: () => {
      if (token === "expired") return { ok: false, reason: "expired" };
      if (!VALID_TOKENS.has(token)) return { ok: false, reason: "invalid" };
      // 공개 투영: 민감 필드 제외, 멤버는 이니셜·색만.
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
    },
  });
}
