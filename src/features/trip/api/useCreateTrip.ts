"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { TripDto } from "@/features/itinerary";

import type { CreateTripInput } from "../lib/tripSchema";

/**
 * 여행 생성 seam — 현재는 **스텁**(새 id 반환, 서버 미연동). 03 §7 생성자=owner.
 *
 * TODO(supabase): mutationFn 을 트랜잭션 RPC 로 교체.
 *   1) trip insert(생성자 = owner, 클라가 보낸 owner/소유 관계 신뢰 안 함, §8.2)
 *   2) members 초대(editor/viewer 만, owner 불가) + 읽기전용 초대 토큰 발급(§8.2)
 *   3) startMode==='template' 이면 시드 템플릿 → place 다수 복제(계약 §4.10)
 *   입력은 서버에서 tripSchema 재검증(§8.3).
 * 성공 시: ['trips'] 무효화 + ['trip', newId] seed → 워크스페이스 진입이 즉시(캐시 연속성).
 */
export function useCreateTrip() {
  const queryClient = useQueryClient();

  return useMutation<{ id: string }, Error, CreateTripInput>({
    mutationFn: (input) => {
      void input; // 스텁: 서버 대신 새 id 생성(실연동 시 input 으로 trip insert).
      const id = `trip_${Date.now().toString(36)}`;
      return Promise.resolve({ id });
    },
    onSuccess: ({ id }, input) => {
      const seed: TripDto = {
        id,
        title: input.title,
        start_date: input.start_date,
        end_date: input.end_date,
        my_role: "owner",
        cover_icon: input.icon,
      };
      queryClient.setQueryData(["trip", id], seed);
      void queryClient.invalidateQueries({ queryKey: ["trips"] });
    },
  });
}
