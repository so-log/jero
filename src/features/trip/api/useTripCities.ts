"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/env";

import type { TransferMode, TripCity } from "../lib/citySchedule";

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
  // 도착 이동(Phase 5, additive) — 컬럼 없던 시절이면 undefined 로 안전.
  arrival_mode: string | null;
  arrival_name: string | null;
  arrival_time: string | null;
  arrival_duration_min: number | null;
}

const CITY_COLS =
  "id, name, country, lat, lng, nights, seq, arrival_mode, arrival_name, arrival_time, arrival_duration_min";

function toCity(r: TripCityRow): TripCity {
  return {
    id: r.id,
    name: r.name,
    country: r.country,
    lat: r.lat,
    lng: r.lng,
    nights: r.nights,
    seq: r.seq,
    arrival:
      r.arrival_mode || r.arrival_name || r.arrival_time || r.arrival_duration_min != null
        ? {
            mode: (r.arrival_mode as TransferMode | null) ?? null,
            name: r.arrival_name ?? null,
            // time(HH:MM:SS) → 'HH:MM' 정규화(usePlacesQuery start_time 규약과 동일).
            time: r.arrival_time ? r.arrival_time.slice(0, 5) : null,
            durationMin: r.arrival_duration_min ?? null,
          }
        : null,
  };
}

export function useTripCities(tripId: string) {
  return useQuery<TripCity[]>({
    queryKey: ["cities", tripId],
    queryFn: async () => {
      if (!hasSupabase) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from("trip_city")
        .select(CITY_COLS)
        .eq("trip_id", tripId)
        .order("seq")
        .returns<TripCityRow[]>();
      if (error) throw new Error("도시 목록을 불러오지 못했어요.");
      return (data ?? []).map(toCity);
    },
  });
}
