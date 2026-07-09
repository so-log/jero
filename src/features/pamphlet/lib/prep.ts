/** 팜플렛 기본 준비물 목록(2차, 시안 PREP 이관). pamphletStore 초기값 — 서버 저장 안 함(기획 §4). */
export interface PrepItem {
  label: string;
  on: boolean;
}

export const DEFAULT_PREP: PrepItem[] = [
  { label: "여권 · 신분증", on: true },
  { label: "유심 / 로밍", on: true },
  { label: "환전 · 카드", on: true },
  { label: "교통패스 · 예약권", on: true },
  { label: "보조배터리 · 어댑터", on: false },
  { label: "상비약 · 밴드", on: false },
  { label: "우산 / 양산", on: false },
  { label: "편한 운동화", on: true },
];
