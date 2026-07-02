import type { PlaceDto } from "@/features/itinerary";

/**
 * 공유(08) 공개 스냅샷 — 토큰 스코프의 **읽기 전용** 투영. 04와 동일 Place 데이터지만
 * 민감 필드(이메일·예산/정산·내부 id)는 **서버 응답에서 제외**(§8.5). 멤버는 표시용 최소 정보만.
 */
export interface SharedMember {
  initial: string;
  color: string;
}

export interface SharedTripSnapshot {
  trip: {
    title: string;
    start_date: string;
    end_date: string;
  };
  /** 일정 장소(읽기 전용). */
  places: PlaceDto[];
  /** 표시용 멤버(이니셜·색만). */
  members: SharedMember[];
}

/** 토큰 조회 결과 — 유효/무효(만료·폐기·오류). 무효 사유는 일반화 메시지로만 노출(§8.5). */
export type SharedTripResult =
  | { ok: true; snapshot: SharedTripSnapshot }
  | { ok: false; reason: "expired" | "invalid" };
