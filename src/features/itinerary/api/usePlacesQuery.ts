"use client";

import { useQuery } from "@tanstack/react-query";

import type { CategoryKey } from "@/lib/constants/category";
import type { IconName } from "@/lib/constants/icons";
import type { Role } from "@/lib/constants/roles";
import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/env";

import type {
  FolderDto,
  MemberDto,
  PlaceDto,
  PlacesResponse,
  TripDto,
} from "../types";
import { MEMBERS_FIXTURE, PLAN_FIXTURE } from "./fixtures";

/**
 * usePlacesQuery — 04·05·06 공유 단일 소스(설계 §4). 컴포넌트 직접 fetch 금지(§7.1).
 * Supabase 연동은 seam 내부만 — env 가드로 키 없으면 fixture 유지. RLS(is_trip_member)로 내 여행만(§8.2).
 * `place.scheduled_date` 유무로 일정/저장 분리(계약 §4.5). start_time(time) 은 'HH:MM' 로 정규화.
 */
interface PlaceRow {
  id: string;
  name: string;
  category: CategoryKey;
  area: string | null;
  lat: number | null;
  lng: number | null;
  google_place_id: string | null;
  memo: string | null;
  saved_by: string | null;
  scheduled_date: string | null;
  order_in_day: number | null;
  start_time: string | null;
  duration_min: number | null;
  scheduled_by: string | null;
  folder_id: string | null;
}
interface FolderRow {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}
interface TripHeaderRow {
  role: Role;
  trip: {
    id: string;
    title: string;
    start_date: string;
    end_date: string;
    cover_icon: string;
  } | null;
}

const PLACE_COLS =
  "id, name, category, area, lat, lng, google_place_id, memo, saved_by, scheduled_date, order_in_day, start_time, duration_min, scheduled_by, folder_id";

function toPlace(r: PlaceRow): PlaceDto {
  return { ...r, start_time: r.start_time ? r.start_time.slice(0, 5) : null };
}

export function usePlacesQuery(tripId: string) {
  return useQuery<PlacesResponse>({
    queryKey: ["places", tripId],
    queryFn: async () => {
      if (!hasSupabase) return PLAN_FIXTURE;
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요해요.");

      const [headerRes, placesRes, foldersRes] = await Promise.all([
        supabase
          .from("trip_member")
          .select("role, trip:trip_id ( id, title, start_date, end_date, cover_icon )")
          .eq("trip_id", tripId)
          .eq("user_id", user.id)
          .limit(1)
          .returns<TripHeaderRow[]>(),
        supabase
          .from("place")
          .select(PLACE_COLS)
          .eq("trip_id", tripId)
          .returns<PlaceRow[]>(),
        supabase
          .from("folder")
          .select("id, name, icon, color")
          .eq("trip_id", tripId)
          .order("sort_order")
          .returns<FolderRow[]>(),
      ]);

      const header = headerRes.data?.[0];
      if (headerRes.error || !header?.trip) {
        throw new Error("여행 정보를 불러오지 못했어요.");
      }
      if (placesRes.error || foldersRes.error) {
        throw new Error("장소를 불러오지 못했어요.");
      }

      const trip: TripDto = {
        id: header.trip.id,
        title: header.trip.title,
        start_date: header.trip.start_date,
        end_date: header.trip.end_date,
        my_role: header.role,
        cover_icon: header.trip.cover_icon as IconName,
      };
      const all = (placesRes.data ?? []).map(toPlace);
      const folders: FolderDto[] = (foldersRes.data ?? []).map((f) => ({
        id: f.id,
        name: f.name,
        icon: (f.icon ?? "bookmark") as IconName,
        color: f.color ?? "#3B7DF0",
      }));
      return {
        trip,
        places: all.filter((p) => p.scheduled_date !== null),
        saved_places: all.filter((p) => p.scheduled_date === null),
        folders,
      };
    },
  });
}

interface MemberRow {
  role: Role;
  profile: { id: string; name: string; avatar_color: string } | null;
}

/** useMembersQuery — 멤버(아바타·역할). online 은 presence 연동 전까지 false(설계 §8, 실시간 단계). */
export function useMembersQuery(tripId: string) {
  return useQuery<MemberDto[]>({
    queryKey: ["members", tripId],
    queryFn: async () => {
      if (!hasSupabase) return MEMBERS_FIXTURE;
      const supabase = createClient();
      const { data, error } = await supabase
        .from("trip_member")
        .select("role, profile:user_id ( id, name, avatar_color )")
        .eq("trip_id", tripId)
        .returns<MemberRow[]>();
      if (error) throw new Error("멤버를 불러오지 못했어요.");
      return (data ?? [])
        .filter(
          (m): m is MemberRow & { profile: NonNullable<MemberRow["profile"]> } =>
            m.profile !== null,
        )
        .map((m) => ({
          id: m.profile.id,
          name: m.profile.name,
          initial: m.profile.name.slice(0, 1),
          color: m.profile.avatar_color,
          role: m.role,
          online: false,
        }));
    },
  });
}
