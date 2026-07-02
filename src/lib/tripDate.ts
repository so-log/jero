/**
 * 여행 날짜 파생 — 기간 표시·N박N일·D-day·지난 여부. 순수 함수(여행 현지 기준, 설계 §11).
 * 'YYYY-MM-DD' + UTC 자정으로 다뤄 로컬 타임존 영향 차단. dday/past 는 "오늘"을 인자로 받아 순수 유지.
 */
function parts(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

function toUTC(iso: string): number {
  const { y, m, d } = parts(iso);
  return Date.UTC(y, m - 1, d);
}

/** Date → 'YYYY-MM-DD'(로컬 달력일 기준). 컴포넌트에서 new Date() 로 오늘을 만들 때 사용. */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatPeriod(startDate: string, endDate: string): string {
  const s = parts(startDate);
  const e = parts(endDate);
  const start = `${s.y}.${s.m}.${s.d}`;
  const end = s.y === e.y ? `${e.m}.${e.d}` : `${e.y}.${e.m}.${e.d}`;
  return `${start} – ${end}`;
}

export function nightsDays(
  startDate: string,
  endDate: string,
): { nights: number; days: number; label: string } {
  const days = Math.round((toUTC(endDate) - toUTC(startDate)) / 86_400_000) + 1;
  const nights = Math.max(0, days - 1);
  return { nights, days, label: `${nights}박 ${days}일` };
}

/** 지난 여행 여부 — 종료일이 오늘보다 이전. */
export function isPast(endDate: string, todayISO: string): boolean {
  return toUTC(endDate) < toUTC(todayISO);
}

/** D-day 라벨(예정 여행만) — "D-25" / "D-DAY". 지난 여행이면 null. */
export function ddayLabel(startDate: string, todayISO: string): string | null {
  const diff = Math.round((toUTC(startDate) - toUTC(todayISO)) / 86_400_000);
  if (diff > 0) return `D-${diff}`;
  if (diff === 0) return "D-DAY";
  return null;
}
