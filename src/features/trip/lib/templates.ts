import type { IconName } from "@/lib/constants/icons";

/**
 * 정적 시드 템플릿 목록(03 §12 — 복제 전용, 생성/관리 UI 없음). 시안 TEMPLATES.
 * id 는 서버 `trip_template.id`(슬러그, 0005 시드)와 일치 — 선택값이 create_trip RPC 복제 대상이 된다.
 * 실제 복제 데이터가 있는 것만 노출(빈 선택 방지).
 */
export interface TripTemplate {
  id: string;
  name: string;
  meta: string;
  icon: IconName;
}

export const TRIP_TEMPLATES: TripTemplate[] = [
  { id: "tpl-tokyo", name: "도쿄 클래식 4일", meta: "10곳 · 명소 위주", icon: "building" },
  { id: "tpl-jeju", name: "제주 드라이브 3일", meta: "8곳 · 자연 + 카페", icon: "mountain" },
];
