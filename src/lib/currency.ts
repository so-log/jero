/**
 * 통화 표시 포맷 (base=KRW, 계약 §7). 환산 자체는 lib/constants/fx.ts(convertToBase).
 */

/** ₩1,284,000 형식. */
export function formatKRW(amount: number): string {
  return `₩${Math.round(amount).toLocaleString("ko-KR")}`;
}

/** 만 단위 축약(차트 라벨용): 412000 → "41.2만", 420000 → "42만". */
export function formatMan(amount: number): string {
  const man = amount / 10000;
  return `${man % 1 === 0 ? man.toFixed(0) : man.toFixed(1)}만`;
}
