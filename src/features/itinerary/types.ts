import type { CategoryKey } from "@/lib/constants/category";
import type { IconName } from "@/lib/constants/icons";
import type { Role } from "@/lib/constants/roles";

/**
 * 계약(데이터모델_계약 §4.5 place / §5 04 응답) 파생 뷰 타입.
 * Supabase 생성 타입이 계약서가 되면(§7.2) 이 타입은 그 타입에서 파생하도록 좁힌다.
 * 지금은 fixture(응답 예시)를 단일 출처로 사용 — 04 contract example 형태 그대로.
 */
export interface PlaceDto {
  id: string;
  name: string;
  category: CategoryKey;
  /** 'YYYY-MM-DD' (일정 배정) | null (저장만) — 04 저장/일정 단일 구분. */
  scheduled_date: string | null;
  /** 같은 날 순서(동선·드래그). */
  order_in_day: number | null;
  /** 'HH:MM'. */
  start_time: string | null;
  /** 소요 시간(분) — 05 주/일 모드 블록 높이. */
  duration_min: number | null;
  memo: string | null;
  lat: number | null;
  lng: number | null;
  google_place_id?: string | null;
  /** 일정에 추가한 멤버 id(05 "추가 · {멤버}"). */
  scheduled_by?: string | null;
  /** 저장 위치(사용자 폴더) id — 06. null=미분류. */
  folder_id?: string | null;
  /** 위치/지역 표시(06). */
  area?: string | null;
  /** 저장한 멤버 id(06 카드 아바타). */
  saved_by?: string | null;
}

/** 사용자 폴더(컬렉션) — 06. 카테고리 enum 과 별개(데이터 계약 §4.4). "전체 장소"는 가상. */
export interface FolderDto {
  id: string;
  name: string;
  icon: IconName;
  /** 폴더 아이콘 색(전경). */
  color: string;
}

export interface TripDto {
  id: string;
  title: string;
  /** 'YYYY-MM-DD'. */
  start_date: string;
  end_date: string;
  my_role: Role;
  cover_icon: IconName;
  /** 커버 색(프리셋 키 또는 hex, 헤더 메달리언). 누락 시 resolver 가 기본색으로(하위호환). */
  cover_color?: string | null;
  /** 나라·지역(표지·헤더 표시용, 선택). 팜플렛(2차)에서 사용. */
  country?: string | null;
  region?: string | null;
}

/** usePlacesQuery(trip_id) 응답 — 04·05·06 공유 단일 소스(설계 §4). */
export interface PlacesResponse {
  trip: TripDto;
  /** 일정 장소(scheduled_date != null). */
  places: PlaceDto[];
  /** 저장 장소(scheduled_date == null). */
  saved_places: PlaceDto[];
  /** 사용자 폴더(06). "전체 장소"는 가상이라 미포함. */
  folders: FolderDto[];
}

/** 기간에서 파생한 Day(인덱스 0-based, 날짜·요일). */
export interface Day {
  index: number;
  /** 'YYYY-MM-DD'. */
  date: string;
  /** 'Day 1' 등 표시 라벨. */
  label: string;
  /** 요일 한 글자(월·화·…). */
  weekday: string;
}

/** 04 접속 멤버(presence) — 아바타·온라인 점. profile.avatar_color(계약 §4.1). */
export interface MemberDto {
  id: string;
  name: string;
  initial: string;
  color: string;
  role: Role;
  online: boolean;
}
