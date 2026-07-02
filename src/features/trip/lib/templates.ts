import type { IconName } from "@/lib/constants/icons";

/**
 * 정적 시드 템플릿 3종(03 §12 — 복제 전용, 생성/관리 UI 없음). 시안 TEMPLATES.
 */
export interface TripTemplate {
  id: string;
  name: string;
  meta: string;
  icon: IconName;
}

export const TRIP_TEMPLATES: TripTemplate[] = [
  { id: "tpl-tokyo", name: "도쿄 클래식 4일", meta: "12곳 · 명소 위주", icon: "building" },
  { id: "tpl-jeju", name: "제주 드라이브 3일", meta: "8곳 · 자연 + 카페", icon: "mountain" },
  { id: "tpl-osaka", name: "오사카 먹방 5일", meta: "15곳 · 식도락", icon: "utensils" },
];
