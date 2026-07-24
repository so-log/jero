import type { CoverValue } from "@/lib/constants/covers";
import type { IconName } from "@/lib/constants/icons";
import type { Role } from "@/lib/constants/roles";

/**
 * 02 내 여행 목록 카드 요약 (데이터 계약 §5 trips 응답). 목록 전용 투영 — 상세는 ['trip', id].
 * nights/dday/past 는 클라 셀렉터(lib/tripDate)로 "오늘" 기준 계산(서버 포함도 가능, §13).
 */
export interface TripMemberAvatar {
  initial: string;
  color: string;
  /** 프로필 사진 URL(있으면 이미지, 없으면 이니셜) — Presence 로 직접 전달. */
  imageUrl?: string | null;
}

export interface TripSummaryDto {
  id: string;
  title: string;
  cover_color: CoverValue;
  cover_icon: IconName;
  /** 'YYYY-MM-DD'. */
  start_date: string;
  end_date: string;
  /** 생성 시각(ISO) — 목록 "생성순" 정렬용(additive). 누락 시 정렬은 출발일로 폴백. */
  created_at?: string;
  /** 현재 사용자의 이 여행 내 역할(카드 배지). */
  my_role: Role;
  member_avatars: TripMemberAvatar[];
  place_count: number;
  /** 제목+대표 장소명(소문자) — 클라 검색용(§12). */
  search_text: string;
}

export type TripFilter = "upcoming" | "past" | "all";
