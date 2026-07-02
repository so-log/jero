"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { InviteRole } from "@/features/trip";

/**
 * 멤버·공유 관리 seam(오버레이 ②). 현재 **스텁** — 폼·검증·낙관 UI 까지.
 * 무효화 키 ['members', tripId] 는 워크스페이스 멤버 쿼리와 일치 → 닫으면 presence·멤버 반영.
 *
 * TODO(supabase): 초대/역할 변경/제거/링크 권한은 **owner 만**, 서버에서 소유·권한 재확인(§8.2, 권한 상승 방지).
 *   초대 메일 발송·rate limit(§8.7). 읽기 전용 링크는 08 토큰 스코프와 연결.
 */
export function useShareActions(tripId: string) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["members", tripId] });

  const invite = useMutation<void, Error, { email: string; role: InviteRole }>({
    mutationFn: () => Promise.resolve(),
    onSuccess: () => void invalidate(),
  });
  const changeRole = useMutation<void, Error, { memberId: string; role: InviteRole }>({
    mutationFn: () => Promise.resolve(),
    onSuccess: () => void invalidate(),
  });
  const removeMember = useMutation<void, Error, string>({
    mutationFn: () => Promise.resolve(),
    onSuccess: () => void invalidate(),
  });

  return { invite, changeRole, removeMember };
}
