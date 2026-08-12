import { z } from "zod";

/**
 * 챗 요청 스키마 (설계 §6.3). **클라(UX)·서버(신뢰 경계) 양쪽에서 같은 스키마로 검증**한다(§8.3).
 * 상한(턴 수·글자 수)은 비용·지연 관리이자 남용 방지다.
 */

/** 사용자 메시지 1건의 최대 길이. */
export const MAX_MESSAGE_CHARS = 2000;
/** 서버로 보내는 최근 대화 턴 수 상한(설계 §3.4). */
export const MAX_HISTORY_TURNS = 8;

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(MAX_MESSAGE_CHARS),
});

export const chatRequestSchema = z.object({
  tripId: z.string().uuid(),
  /** 최근 턴만. 마지막은 사용자 메시지여야 한다. */
  messages: z
    .array(chatMessageSchema)
    .min(1)
    .max(MAX_HISTORY_TURNS)
    .refine((m) => m[m.length - 1]?.role === "user", {
      message: "마지막 메시지는 사용자여야 합니다.",
    }),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
