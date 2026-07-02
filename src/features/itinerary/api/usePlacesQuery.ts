import { useQuery } from "@tanstack/react-query";

import type { MemberDto, PlacesResponse } from "../types";
import { MEMBERS_FIXTURE, PLAN_FIXTURE } from "./fixtures";

/**
 * usePlacesQuery — 04·05·06 공유 단일 소스(설계 §4). 컴포넌트 직접 fetch 금지(§7.1).
 * TODO(supabase): queryFn 을 Supabase select(RLS 적용)로 교체. 키·셀렉터 구조는 유지.
 */
export function usePlacesQuery(tripId: string) {
  return useQuery<PlacesResponse>({
    queryKey: ["places", tripId],
    // 연동 전: 계약 응답 예시 fixture 반환(§7.2). 동기 반환도 queryFn 으로 유효.
    queryFn: () => PLAN_FIXTURE,
  });
}

/** useMembersQuery — 접속 멤버(presence 아바타·역할). 설계 §4 별도 쿼리. */
export function useMembersQuery(tripId: string) {
  return useQuery<MemberDto[]>({
    queryKey: ["members", tripId],
    queryFn: () => MEMBERS_FIXTURE,
  });
}
