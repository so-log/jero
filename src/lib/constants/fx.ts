/**
 * 환율 (base = KRW) — 계약 §3 currency enum 4종 / §4.6·§7.
 * 지출 생성 시 이 값을 `expense.fx_rate` 로 **스냅샷 저장**(사용자 입력 아님,
 * 이후 환율 변동 무관). 집계·정산은 `amount_base = amount * fx_rate`(=KRW) 기준.
 * 실시간 환율 API 는 phase 2.
 */
export const FX_BASE = "KRW" as const;

export type Currency = "KRW" | "JPY" | "USD" | "EUR";

/** 1 통화단위 = N KRW (MVP 정적값) */
export const FX_RATES: Record<Currency, number> = {
  KRW: 1,
  JPY: 9,
  USD: 1380,
  EUR: 1480,
};

export const CURRENCIES: Currency[] = ["KRW", "JPY", "USD", "EUR"];

/** 입력 통화 금액 → base(KRW) 환산 */
export function convertToBase(amount: number, currency: Currency): number {
  return amount * FX_RATES[currency];
}

/** 환율 안내 캡션 (예산 입력 보조 표시) */
export const FX_CAPTION: Record<Currency, string> = {
  KRW: "",
  JPY: "1 JPY ≈ 9원",
  USD: "1 USD ≈ 1,380원",
  EUR: "1 EUR ≈ 1,480원",
};
