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

/** 방어적 한계 — URL/렌더 폭주 방지(사용자 편집분). */
const MAX_ITEMS = 40;
const MAX_LABEL = 60;

/** 편집된 준비물 → URL 쿼리 문자열(JSON). 내보내기/인쇄 라우트로 전달(팜플렛_설계 §13). */
export function encodePrep(prep: PrepItem[]): string {
  return JSON.stringify(
    prep.slice(0, MAX_ITEMS).map((p) => ({
      label: p.label.slice(0, MAX_LABEL),
      on: !!p.on,
    })),
  );
}

/** 쿼리 문자열 → 준비물. 없거나 형식 불량이면 기본 목록으로 폴백(안전). */
export function decodePrep(raw: string | string[] | undefined): PrepItem[] {
  const s = Array.isArray(raw) ? raw[0] : raw;
  const fallback = () => DEFAULT_PREP.map((p) => ({ ...p }));
  if (!s) return fallback();
  try {
    const parsed: unknown = JSON.parse(s);
    if (!Array.isArray(parsed)) return fallback();
    const items = parsed
      .filter(
        (x): x is { label: string; on: boolean } =>
          !!x &&
          typeof (x as { label?: unknown }).label === "string" &&
          typeof (x as { on?: unknown }).on === "boolean",
      )
      .slice(0, MAX_ITEMS)
      .map((x) => ({ label: x.label.slice(0, MAX_LABEL), on: x.on }));
    return items.length > 0 ? items : fallback();
  } catch {
    return fallback();
  }
}
