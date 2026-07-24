"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import type { TripDto } from "@/features/itinerary";
import type { IconName } from "@/lib/constants/icons";
import type { Role } from "@/lib/constants/roles";
import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/env";

import type { TripSummaryDto } from "../types";
import { TRIPS_FIXTURE } from "./fixtures";

/**
 * 쿼리 키: ['trips'] 목록(02) · ['trip', id] 상세 헤더(셸). 카드 클릭 → seed 로 헤더 즉시 렌더.
 * 컴포넌트 직접 fetch 금지(§7.1). Supabase 연동은 seam 내부만 — **env 가드**로 키 없으면 fixture 유지.
 * RLS(is_trip_member)로 내가 멤버인 trip 만 조회된다(§8.2, 격리).
 */

/** trip_member ⨝ trip ⨝ place/멤버 profile 중첩 select 행. */
interface TripMemberRow {
  role: Role;
  trip: {
    id: string;
    title: string;
    cover_icon: string;
    cover_color: string;
    start_date: string;
    end_date: string;
    created_at: string | null;
    place: { name: string }[];
    trip_member: {
      profile: { name: string; avatar_color: string; avatar_url: string | null } | null;
    }[];
  } | null;
}

/** 상세 헤더 select 행. */
interface TripHeaderRow {
  role: Role;
  trip: {
    id: string;
    title: string;
    start_date: string;
    end_date: string;
    cover_icon: string;
    cover_color: string;
  } | null;
}

const LIST_SELECT =
  "role, trip:trip_id ( id, title, cover_icon, cover_color, start_date, end_date, created_at, place ( name ), trip_member ( profile:user_id ( name, avatar_color, avatar_url ) ) )";

function rowToSummary(row: TripMemberRow): TripSummaryDto | null {
  const t = row.trip;
  if (!t) return null;
  const names = t.place.map((p) => p.name);
  return {
    id: t.id,
    title: t.title,
    // text 컬럼 — 프리셋 키 또는 hex 를 그대로 보존(coverGradient resolver 가 해석).
    cover_color: t.cover_color,
    cover_icon: t.cover_icon as IconName,
    start_date: t.start_date,
    end_date: t.end_date,
    created_at: t.created_at ?? undefined,
    my_role: row.role,
    member_avatars: t.trip_member
      .map((m) => m.profile)
      .filter(
        (p): p is { name: string; avatar_color: string; avatar_url: string | null } =>
          p !== null,
      )
      .map((p) => ({
        initial: p.name.slice(0, 1),
        color: p.avatar_color,
        imageUrl: p.avatar_url,
      })),
    place_count: names.length,
    search_text: [t.title, ...names].join(" ").toLowerCase(),
  };
}

export function useTripsQuery() {
  return useQuery<TripSummaryDto[]>({
    queryKey: ["trips"],
    queryFn: async () => {
      if (!hasSupabase) return TRIPS_FIXTURE;
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("trip_member")
        .select(LIST_SELECT)
        .eq("user_id", user.id)
        .returns<TripMemberRow[]>();
      if (error) throw new Error("여행 목록을 불러오지 못했어요.");
      return (data ?? [])
        .map(rowToSummary)
        .filter((t): t is TripSummaryDto => t !== null);
    },
  });
}

/** 요약 → 상세(TripDto) 투영. seed·fixture fallback 공용. */
function toTripDto(summary: TripSummaryDto): TripDto {
  return {
    id: summary.id,
    title: summary.title,
    start_date: summary.start_date,
    end_date: summary.end_date,
    my_role: summary.my_role,
    cover_icon: summary.cover_icon,
    cover_color: summary.cover_color,
  };
}

export function useTripQuery(tripId: string) {
  return useQuery<TripDto>({
    queryKey: ["trip", tripId],
    queryFn: async () => {
      if (!hasSupabase) {
        const found = TRIPS_FIXTURE.find((t) => t.id === tripId);
        return toTripDto(found ?? TRIPS_FIXTURE[0]);
      }
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요해요.");
      const { data, error } = await supabase
        .from("trip_member")
        .select(
          "role, trip:trip_id ( id, title, start_date, end_date, cover_icon, cover_color )",
        )
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .limit(1)
        .returns<TripHeaderRow[]>();
      const row = data?.[0];
      if (error || !row?.trip) throw new Error("여행을 불러오지 못했어요.");
      return {
        id: row.trip.id,
        title: row.trip.title,
        start_date: row.trip.start_date,
        end_date: row.trip.end_date,
        my_role: row.role,
        cover_icon: row.trip.cover_icon as IconName,
        cover_color: row.trip.cover_color,
      };
    },
  });
}

/** 목록 로드 후 각 여행의 ['trip', id] 캐시 seed → 상세 진입 시 헤더 즉시 표시. */
export function useSeedTripDetails(trips: TripSummaryDto[] | undefined) {
  const queryClient = useQueryClient();
  useEffect(() => {
    for (const t of trips ?? []) {
      if (!queryClient.getQueryData(["trip", t.id])) {
        queryClient.setQueryData(["trip", t.id], toTripDto(t));
      }
    }
  }, [trips, queryClient]);
}
