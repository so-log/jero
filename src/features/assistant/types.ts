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

/**
 * 코스 제안 1개 항목 (Phase 4, 설계 §5.2).
 * `coursePlaceSchema` 의 런타임 검증을 통과한 것만 이 타입이 된다 — 좌표가 반드시 있다.
 */
export interface CoursePlace {
  name: string;
  category: string;
  lat: number;
  lng: number;
  googlePlaceId: string | null;
  address?: string;
  /** 1-based Day 번호. */
  day: number;
  /** 그 Day 내 순서(1-based). */
  order: number;
  reason: string;
}

/** Day 별 코스 제안 — **제안일 뿐 DB 변경은 아니다**(설계 §5.1 "쓰기 도구 없음"). */
export interface CoursePlan {
  summary: string;
  places: CoursePlace[];
}

/**
 * 코스 적용 결과 — 부분 실패를 있는 그대로 알린다(설계 §7 "성공분 유지 + 실패 건수 안내").
 *
 * ★ 이 결과는 **대화(zustand)에 남는다**. 패널을 닫았다 열어도 "이미 적용한 코스"임을 알 수 있어야
 *   ① 되돌리기를 계속 제공하고 ② 같은 코스를 다시 눌러 **중복 생성**하는 사고를 막는다.
 */
export interface CourseApplyResult {
  /** 제안된 장소 수. */
  total: number;
  /** 실제로 추가·배정까지 끝난 수. */
  applied: number;
  /** 되돌리기 대상 — 이번 적용으로 **새로 생성된** place id 스냅샷(설계 §5.2-6). */
  createdIds: string[];
  /** 적용된 날짜들(오름차순) — 동선 최적화 연계 대상. */
  dates: string[];
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  /** 스트리밍 중에는 부분 텍스트가 누적된다. */
  content: string;
  /** 이 답변에 딸린 실존 장소 카드(Phase 3). 사용자 메시지에는 없다. */
  cards?: PlaceCard[];
  /** 이 답변에 딸린 코스 제안(Phase 4). 사용자가 "코스 적용"을 눌러야 반영된다. */
  course?: CoursePlan;
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
