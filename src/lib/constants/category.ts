import type { IconName } from "./icons";

/**
 * 카테고리 단일 출처 (데이터모델_계약 §3 통합 enum / 디자인 시스템.dc.html v1.0).
 * 일정·지출 공용 8종. DB enum 키 ↔ 라벨·Lucide 아이콘·칩 배경(bg)·아이콘 색(fg).
 * 색은 여기서만 정의 — 컴포넌트에서 하드코딩 금지 (CLAUDE.md §7.1).
 */
export type CategoryKey =
  | "food"
  | "cafe"
  | "gift"
  | "shopping"
  | "museum"
  | "hotel"
  | "transport"
  | "etc";

export interface CategoryMeta {
  /** 표시 라벨 (계약 §3 단일 라벨로 통일) */
  label: string;
  /** Lucide 아이콘 이름 (Icon 래퍼에서 컴포넌트로 매핑) */
  icon: IconName;
  /** 칩/타일 배경색 */
  bg: string;
  /** 아이콘·텍스트 전경색 */
  fg: string;
}

export const CATEGORY: Record<CategoryKey, CategoryMeta> = {
  food: { label: "식당", icon: "utensils", bg: "#FFECEB", fg: "#E8615C" },
  cafe: { label: "카페", icon: "coffee", bg: "#FBF1E4", fg: "#C5893A" },
  gift: { label: "기념품", icon: "gift", bg: "#F1ECFD", fg: "#8B6FE0" },
  shopping: {
    label: "쇼핑",
    icon: "shopping-bag",
    bg: "#FCE8F1",
    fg: "#D9609A",
  },
  museum: { label: "명소", icon: "landmark", bg: "#E9F1FE", fg: "#3B7DF0" },
  hotel: { label: "숙소", icon: "bed", bg: "#E1F6EE", fg: "#1FA078" },
  transport: { label: "교통", icon: "bus", bg: "#E6F3FA", fg: "#3E97CC" },
  etc: { label: "기타", icon: "circle-dot", bg: "#EEF0F4", fg: "#7B828F" },
};

/** UI 칩/필터 표시 순서 (디자인 시스템 기준) */
export const CATEGORY_KEYS: CategoryKey[] = [
  "food",
  "cafe",
  "gift",
  "shopping",
  "museum",
  "hotel",
  "transport",
  "etc",
];
