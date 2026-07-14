/**
 * 생성 마법사 Step2 캘린더 순수 로직(03) — 임의 월 그리드·ISO 파싱·타이핑 입력 파싱.
 * 날짜는 'YYYY-MM-DD' ISO 문자열 단일 표현(계약 §4). 월(m)은 0-based(JS Date 관례).
 */
export interface GridCell {
  /** 'YYYY-MM-DD'. */
  iso: string;
  /** 표시용 일(day) 숫자. */
  n: number;
  /** 현재 보는 달 소속 여부(아니면 흐림·비활성). */
  inMonth: boolean;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** (년, 월0, 일) → ISO. */
export function toISO(year: number, month0: number, day: number): string {
  return `${year}-${pad(month0 + 1)}-${pad(day)}`;
}

/** ISO → {y, m(0-based), d} | null. */
export function parseISO(
  iso: string | undefined | null,
): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!match) return null;
  return { y: +match[1], m: +match[2] - 1, d: +match[3] };
}

/** 표시용 'Y.M.D'(빈 값이면 ""). */
export function formatDateInput(iso: string | undefined | null): string {
  const p = parseISO(iso ?? "");
  return p ? `${p.y}.${p.m + 1}.${p.d}` : "";
}

/** 타이핑 입력 → ISO. 'YYYY.M.D' / 'YYYY-M-D' / 'YYYY/M/D' 허용. 실제 존재 날짜만. */
export function parseUserDate(text: string): string | null {
  const m = /^\s*(\d{4})[.\-/\s]+(\d{1,2})[.\-/\s]+(\d{1,2})\s*$/.exec(text);
  if (!m) return null;
  const y = +m[1];
  const mo = +m[2] - 1;
  const d = +m[3];
  const dt = new Date(y, mo, d);
  // 롤오버(예: 2.30 → 3.2) 방지 — 구성요소 일치 확인.
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) {
    return null;
  }
  return toISO(y, mo, d);
}

/** 월 이동 — {y, m(0-based)} 를 delta 개월 이동(연 경계 넘김 안전). */
export function shiftMonth(
  view: { y: number; m: number },
  delta: number,
): { y: number; m: number } {
  const d = new Date(view.y, view.m + delta, 1);
  return { y: d.getFullYear(), m: d.getMonth() };
}

/** 해당 월(0-based)의 6주 그리드 셀 — 앞뒤 인접월 채움 포함. */
export function monthCells(year: number, month0: number): GridCell[] {
  const startDow = new Date(year, month0, 1).getDay(); // 0=일
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const total = Math.ceil((startDow + daysInMonth) / 7) * 7;
  const cells: GridCell[] = [];
  for (let i = 0; i < total; i++) {
    const dt = new Date(year, month0, 1 - startDow + i);
    cells.push({
      iso: toISO(dt.getFullYear(), dt.getMonth(), dt.getDate()),
      n: dt.getDate(),
      inMonth: dt.getMonth() === month0 && dt.getFullYear() === year,
    });
  }
  return cells;
}
