import { z } from "zod";

import { CATEGORY_KEYS, type CategoryKey } from "@/lib/constants/category";

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

/**
 * 코스 제안 스키마 (설계 §5.2) — **서버(도구 출력)·클라(렌더 전 재검증) 공유 단일 출처**.
 *
 * ★ 좌표(`lat`/`lng`)가 **필수**인 것이 이 스키마의 핵심이다. 코스 항목은 그대로 `place` 행이 되어
 *   지도·동선 최적화에 들어가므로, 좌표 없는 항목은 스키마 단계에서 탈락시킨다(설계 §4 grounding).
 *   모델이 만든 값을 그대로 믿지 않고, 서버 도구가 Places 결과로 채운 뒤 여기서 한 번,
 *   클라가 렌더 직전에 다시 한 번 검증한다(2중 방어 — §6.3 "모델 출력은 Zod 로 재검증").
 *
 * 필드명은 설계 §5.2 의 `google_place_id` 를 **camelCase(`googlePlaceId`)로 통일**했다 —
 * 같은 스트림 프레임에 실리는 `PlaceCard`(Phase 3)와 표기가 갈리면 매핑 실수가 생긴다.
 */

/** 코스 1개당 최대 장소 수(설계 §5.2) — 비용·적용 시간 상한. */
export const MAX_COURSE_PLACES = 12;

/** 카테고리 단일 출처(`lib/constants/category`)에서 파생 — 목록이 갈리지 않게 한다. */
const categoryEnum = z.enum(CATEGORY_KEYS as [CategoryKey, ...CategoryKey[]]);

export const coursePlaceSchema = z.object({
  name: z.string().min(1),
  category: categoryEnum,
  /** 필수 — 좌표 없으면 코스에 못 들어간다(설계 §5.2). */
  lat: z.number(),
  lng: z.number(),
  googlePlaceId: z.string().nullable(),
  address: z.string().optional(),
  /** 1-based Day 번호. */
  day: z.number().int().min(1),
  /** 그 Day 내 순서(1-based). */
  order: z.number().int().min(1),
  /** 카드 한 줄 이유. */
  reason: z.string().max(120),
});

export const coursePlanSchema = z.object({
  summary: z.string().max(200),
  places: z.array(coursePlaceSchema).min(1).max(MAX_COURSE_PLACES),
});
