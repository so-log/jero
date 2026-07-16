"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/env";

import type { TripCity } from "../lib/citySchedule";

/**
 * 여행의 도시 목록(seq 순) 조회 — 다중 도시 Phase 1(additive). 날짜는 저장 안 함(citySchedule 로 파생).
 * RLS(is_trip_member)로 멤버만 조회. 컴포넌트 직접 fetch 금지(§7.1) — 이 훅 경유.
 * ★Phase 1 은 UI 미소비(하위호환). 키 없으면 [](도시 축 미노출과 동일).
 */
interface TripCityRow {
  id: string;
  name: string;
  country: string | null;
  lat: number | null;
  lng: number | null;
  nights: number;
  seq: number;
}

export function useTripCities(tripId: string) {
  return useQuery<TripCity[]>({
    queryKey: ["cities", tripId],
    queryFn: async () => {
      if (!hasSupabase) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from("trip_city")
        .select("id, name, country, lat, lng, nights, seq")
        .eq("trip_id", tripId)
        .order("seq")
        .returns<TripCityRow[]>();
      if (error) throw new Error("도시 목록을 불러오지 못했어요.");
      return data ?? [];
    },
  });
}
