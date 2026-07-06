"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { TripDto } from "@/features/itinerary";
import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/env";

import type { CreateTripInput } from "../lib/tripSchema";

/**
 * 여행 생성 seam — `create_trip` RPC(계약 B2.1)로 trip + owner 멤버십(+멤버 초대)을 원자적으로 생성.
 * owner 는 생성으로만 부여(§4.9), 서버가 auth.uid() 로 소유 확정(클라 신뢰 안 함, §8.2). 입력은 서버 재검증(§8.3).
 * env 가드: 키 없으면 스텁(새 id). 성공 시 ['trips'] 무효화 + ['trip', id] seed(즉시 진입).
 */
export function useCreateTrip() {
  const queryClient = useQueryClient();

  return useMutation<{ id: string }, Error, CreateTripInput>({
    mutationFn: async (input) => {
      if (!hasSupabase) {
        return { id: `trip_${Date.now().toString(36)}` };
      }
      const { data, error } = await createClient().rpc("create_trip", {
        payload: {
          title: input.title,
          icon: input.icon,
          cover: input.cover,
          country: input.country,
          region: input.region,
          start_date: input.start_date,
          end_date: input.end_date,
          startMode: input.startMode,
          members: input.members,
        },
      });
      if (error || typeof data !== "string") {
        throw new Error("여행을 만들지 못했어요. 잠시 후 다시 시도해 주세요.");
      }
      return { id: data };
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
