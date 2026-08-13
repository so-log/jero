/** AI 어시스턴트 도메인 타입 (기획 18 · 설계 §3·§9). */

/** 대화 역할. */
export type ChatRole = "user" | "assistant";

/**
 * 추천 장소 카드 (기획 §3 F, 설계 §4).
 * ★ **Google Places 로 실존이 확인된 것만** 이 타입이 된다 — 좌표·place_id 가 필수인 이유다.
 * 모델이 텍스트로 지어낸 이름은 이 목록에 들어올 수 없어 카드·액션이 생기지 않는다.
 */
export interface PlaceCard {
  name: string;
  address: string;
  lat: number;
  lng: number;
  googlePlaceId: string;
  /** `lib/constants/category` 의 카테고리 키. */
  category: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  /** 스트리밍 중에는 부분 텍스트가 누적된다. */
  content: string;
  /** 이 답변에 딸린 실존 장소 카드(Phase 3). 사용자 메시지에는 없다. */
  cards?: PlaceCard[];
}

/** 답변 하단 "참고" 칩 — 서버가 실제로 참고한 근거만 내려준다(기획 §3 E). */
export interface EvidenceChip {
  /** 표시 문구(예: "저장한 장소 12곳"). */
  label: string;
  /** 아이콘 키 — `components/ui/icon` 의 이름. */
  icon: "bookmark" | "route" | "map-pin" | "calendar";
}

/** RAG·구조 컨텍스트 조립 입력 — Supabase 에서 읽은 행(민감 필드 제외). */
export interface TripContextInput {
  trip: {
    title: string;
    start_date: string;
    end_date: string;
    country: string | null;
    region: string | null;
  };
  cities: { name: string; nights: number; seq: number }[];
  /**
   * 장소 — **`memo` 없음**(계약 C2-b). provider 로 나가는 필드를 타입에서부터 막는다.
   */
  places: {
    name: string;
    category: string;
    area: string | null;
    scheduled_date: string | null;
  }[];
  /** pgvector 유사 검색 결과(설계 §3.4). */
  similar: { content: string; similarity: number }[];
}
