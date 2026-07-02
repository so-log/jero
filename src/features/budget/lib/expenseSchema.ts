import { z } from "zod";

/**
 * 지출 추가 폼 단일 출처(오버레이 ③, 07). [B] fx_rate 는 입력받지 않는다 —
 * 생성 시 FX_RATES(base=KRW) 스냅샷으로 자동 계산(데이터 계약 §7). 클라 검증=UX, 서버 재검증(§8.3).
 */
export const expenseSchema = z.object({
  title: z.string().trim().max(60),
  amount: z.number().positive("금액을 입력해 주세요"),
  /** 지출 통화 KRW/JPY 2종(10 §12 확정). */
  currency: z.enum(["KRW", "JPY"]),
  category: z.enum([
    "food",
    "cafe",
    "gift",
    "shopping",
    "museum",
    "hotel",
    "transport",
    "etc",
  ]),
  payerId: z.string().min(1, "결제자를 선택해 주세요"),
  /** 분담 멤버(다중) — 균등 N분의 1이 아니라 선택 멤버 기준. */
  split: z.array(z.string()).min(1, "분담 인원을 한 명 이상 선택해 주세요"),
  /** 배정 Day(1-based). */
  day: z.number().int().positive(),
});

export type ExpenseForm = z.infer<typeof expenseSchema>;

/** 지출 통화는 KRW/JPY 2종(09 기본통화 4종과 정합은 §13). */
export const EXPENSE_CURRENCIES = ["KRW", "JPY"] as const;
/** 지출 카테고리 노출 부분집합(시안). */
export const EXPENSE_CATEGORIES = [
  "food",
  "cafe",
  "shopping",
  "transport",
  "museum",
  "hotel",
] as const;
