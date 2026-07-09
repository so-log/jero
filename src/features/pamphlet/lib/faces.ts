/**
 * 팜플렛 면 구성(2차, 팜플렛_설계 §4) — 활성 섹션 → 앞/뒤 면 셀 배열(시안 faces() 이관).
 * 순수 함수(렌더 무관) — 미리보기·PDF 공용. Day 는 인덱스만 담고 실제 데이터는 PamphletPreview 가 주입.
 */
export interface PamphletSections {
  cover: boolean;
  schedule: boolean;
  prep: boolean;
  intro: boolean;
  qr: boolean;
}

export type FaceCell =
  | { k: "cover" | "prep" | "intro" | "qr" }
  | { k: "day"; dayIndex: number };

/**
 * @param sections 활성 섹션
 * @param dayCount 일정이 있는 Day 수(usePamphletData.days.length)
 * 앞면: 표지 / Day1 / Day2. 뒷면: 잔여 일정(Day3+) / 준비물 / 소개 / QR.
 */
export function faces(
  sections: PamphletSections,
  dayCount: number,
): { front: FaceCell[]; back: FaceCell[] } {
  const front: FaceCell[] = [];
  if (sections.cover) front.push({ k: "cover" });
  if (sections.schedule) {
    if (dayCount > 0) front.push({ k: "day", dayIndex: 0 });
    if (dayCount > 1) front.push({ k: "day", dayIndex: 1 });
  }

  const back: FaceCell[] = [];
  if (sections.schedule) {
    for (let i = 2; i < dayCount; i++) back.push({ k: "day", dayIndex: i });
  }
  if (sections.prep) back.push({ k: "prep" });
  if (sections.intro) back.push({ k: "intro" });
  if (sections.qr) back.push({ k: "qr" });

  return { front, back };
}

/** 면 하단 라벨. day 는 실제 Day 라벨(예: "DAY 2")을 넘겨받아 사용. */
export function faceLabel(cell: FaceCell, dayLabels: string[]): string {
  switch (cell.k) {
    case "cover":
      return "표지";
    case "day":
      return `${(dayLabels[cell.dayIndex] ?? "").replace("DAY", "Day")} 일정`;
    case "prep":
      return "준비물";
    case "intro":
      return "여행지 소개";
    case "qr":
      return "QR · 함께 편집";
  }
}
