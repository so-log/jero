import { stepCountIs, streamText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  buildEvidenceChips,
  buildTripContext,
} from "@/features/assistant/lib/buildTripContext";
import { chatRequestSchema } from "@/features/assistant/lib/assistantSchema";
import { encodeFrame } from "@/features/assistant/lib/streamProtocol";
import { buildSystemPrompt } from "@/features/assistant/lib/systemPrompt";
import type { PlaceCard, TripContextInput } from "@/features/assistant/types";
import {
  getAssistantDailyLimit,
  getChatModel,
  isAssistantEnabled,
  isGroundingEnabled,
} from "@/lib/ai/env";
import { hashTripId, logAssistant } from "@/lib/ai/logging";
import { chatModel } from "@/lib/ai/provider";
import { searchSimilarPlaces } from "@/lib/ai/retrieve";
import { createProposeScheduleTool } from "@/lib/ai/tools/proposeSchedule";
import {
  createSearchPlacesTool,
  MAX_TOOL_CALLS,
} from "@/lib/ai/tools/searchPlaces";
import { hasSupabase } from "@/lib/supabase/env";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * POST /api/assistant/chat — 대화 스트리밍 (설계 §2·§3.4·§6, 기획 18 §5).
 *
 * 게이트 순서(앞이 막히면 뒤는 실행되지 않는다):
 *  ① feature flag ② 세션(auth.getUser) ③ 입력 Zod ④ **멤버십**(trip 조회 = RLS)
 *  ⑤ rate limit(consume_assistant_quota — 원자적, 서버 판정) ⑥ 컨텍스트 조립 ⑦ 스트리밍
 *
 * Phase 2 는 **도구 없음**(설계 §5.1) — 모델은 텍스트만 만든다. 데이터 변경 경로가 존재하지 않으므로
 * 프롬프트 인젝션이 성공해도 DB 는 안전하다. 인젝션 가드는 `systemPrompt.ts`.
 */

/** 근거 칩을 스트림과 함께 전달하는 헤더(본문은 순수 텍스트 스트림이라 메타는 헤더로). */
const EVIDENCE_HEADER = "x-assistant-evidence";
/**
 * 잔여 사용량 헤더(설계 §6.4 "클라는 잔여만 표시"). 판정은 서버가 이미 끝냈고,
 * 이 값은 **표시용**이라 조작해도 한도를 넘길 수 없다(소비는 원자적 RPC).
 */
const REMAINING_HEADER = "x-assistant-remaining";
const LIMIT_HEADER = "x-assistant-limit";

const tripRowSchema = z.object({
  title: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  country: z.string().nullable(),
  region: z.string().nullable(),
});
const cityRowsSchema = z.array(
  z.object({ name: z.string(), nights: z.number(), seq: z.number() }),
);
const placeRowsSchema = z.array(
  z.object({
    name: z.string(),
    category: z.string(),
    area: z.string().nullable(),
    scheduled_date: z.string().nullable(),
  }),
);

type FullStream = AsyncIterable<{ type: string; text?: string }>;
type Grounding = ReturnType<typeof createSearchPlacesTool> | null;
type Course = ReturnType<typeof createProposeScheduleTool> | null;

/** 여행 일수(1-based Day 상한). 기간을 벗어난 Day 제안을 도구 단계에서 걸러내는 데 쓴다. */
function countDays(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 1;
  return Math.floor((end - start) / 86_400_000) + 1;
}

/**
 * 모델 스트림 → 클라 와이어 포맷 변환 (`streamProtocol.ts`).
 *
 * 텍스트 델타는 그대로 흘리고, 스트림이 끝나면 **Places 가 확인해준 장소만** 카드 프레임으로 덧붙인다.
 *
 * ★ grounding 2중 방어의 서버측: 카드·코스의 출처는 모델 출력이 아니라 **도구가 수집한 `collected`** 다.
 *   모델이 본문에 어떤 이름을 지어내든 이 배열에 없으면 카드도 코스 항목도 되지 않는다.
 */
function toFramedStream(
  fullStream: FullStream,
  grounding: Grounding,
  course: Course,
  onDone?: () => void,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const part of fullStream) {
          if (part.type === "text-delta" && part.text) {
            controller.enqueue(encoder.encode(part.text));
          }
        }
      } catch {
        // 스트림 도중 실패 — 여기서 끊는다. 클라는 "내용 없이 끝난 스트림"을 실패로 처리한다.
      }

      const cards: PlaceCard[] = (grounding?.collected ?? []).map((p) => ({
        name: p.name,
        address: p.address,
        lat: p.lat,
        lng: p.lng,
        googlePlaceId: p.googlePlaceId,
        category: p.category,
      }));
      const proposal = course?.proposal ?? null;
      if (cards.length > 0 || proposal) {
        controller.enqueue(
          encoder.encode(
            encodeFrame({
              ...(cards.length > 0 ? { cards } : {}),
              ...(proposal ? { course: proposal } : {}),
            }),
          ),
        );
      }
      controller.close();
      onDone?.();
    },
  });
}

/**
 * 토큰 수 — provider 가 주면 로그에 남긴다(§6.5 허용 필드). 못 주면 생략한다.
 * 로깅이 요청을 깨뜨리지 않도록 실패는 전부 삼킨다.
 */
async function resolveTokens(result: { usage?: unknown }): Promise<number | undefined> {
  try {
    const usage: unknown = await Promise.resolve(result.usage);
    if (usage && typeof usage === "object" && "totalTokens" in usage) {
      const total = (usage as { totalTokens?: unknown }).totalTokens;
      return typeof total === "number" ? total : undefined;
    }
  } catch {
    // provider 가 usage 를 제공하지 않는 경우 — 토큰 없이 나머지만 남긴다.
  }
  return undefined;
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  /**
   * 차단 응답 + 로깅을 한 곳에서 처리한다(§6.5).
   * 로그에 나가는 것은 **코드·상태·여행 해시**뿐 — 사용자 메시지나 provider 원문은 담지 않는다.
   */
  const blocked = (
    code: string,
    status: number,
    extra?: { tripHash?: string; body?: Record<string, unknown> },
  ) => {
    logAssistant({
      event: "chat_blocked",
      code,
      status,
      tripHash: extra?.tripHash,
      latencyMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: code, ...extra?.body }, { status });
  };

  if (!hasSupabase) {
    return blocked("supabase_disabled", 503);
  }
  if (!isAssistantEnabled()) {
    return blocked("assistant_disabled", 503);
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return blocked("unauthorized", 401);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return blocked("invalid_json", 400);
  }
  const parsed = chatRequestSchema.safeParse(raw);
  if (!parsed.success) {
    // ★ Zod 이슈 메시지에는 입력값이 실릴 수 있어 코드만 남긴다(§6.5).
    return blocked("invalid_input", 422);
  }
  const { tripId, messages } = parsed.data;
  const tripHash = hashTripId(tripId);

  // ── ④ 멤버십: trip 단건 조회가 RLS(trip_select = is_trip_member)로 걸러진다.
  //    클라가 보낸 tripId 를 신뢰하지 않고 여기서 실제 접근 권한을 확인한다(§8.2).
  const { data: tripRow, error: tripError } = await supabase
    .from("trip")
    .select("title, start_date, end_date, country, region")
    .eq("id", tripId)
    .maybeSingle();
  if (tripError) {
    return blocked("trip_lookup_failed", 500, { tripHash });
  }
  const trip = tripRowSchema.safeParse(tripRow);
  if (!trip.success) {
    // 비멤버거나 없는 여행 — 존재 여부를 구분해 알려주지 않는다.
    return blocked("forbidden", 403, { tripHash });
  }

  // ── ⑤ rate limit: 원자적 소비(계약 C6). 한도 초과면 모델을 호출하지 않는다.
  const limit = getAssistantDailyLimit();
  const { data: quotaRows, error: quotaError } = await supabase.rpc(
    "consume_assistant_quota",
    { p_limit: limit },
  );
  if (quotaError) {
    return blocked("quota_failed", 500, { tripHash });
  }
  const quota = z
    .array(z.object({ allowed: z.boolean(), remaining: z.number() }))
    .safeParse(quotaRows);
  if (!quota.success || !quota.data[0]) {
    return blocked("quota_failed", 500, { tripHash });
  }
  const remaining = quota.data[0].remaining;
  if (!quota.data[0].allowed) {
    // 클라가 "N/N 다 썼어요 + 리셋 시각"을 그릴 수 있게 한도도 함께 준다(기획 §6).
    return blocked("rate_limited", 429, {
      tripHash,
      body: { remaining: 0, limit },
    });
  }

  // ── ⑥ 컨텍스트: 구조 데이터 + RAG. 모두 요청자 세션(RLS)으로 조회한다.
  const question = messages[messages.length - 1]?.content ?? "";

  const [cityResult, placeResult, similar] = await Promise.all([
    supabase.from("trip_city").select("name, nights, seq").eq("trip_id", tripId),
    // ★ memo 는 선택하지 않는다(계약 C2-b) — provider 로 나갈 수 없게 쿼리에서부터 뺀다.
    supabase
      .from("place")
      .select("name, category, area, scheduled_date")
      .eq("trip_id", tripId),
    searchSimilarPlaces(supabase, tripId, question),
  ]);

  const contextInput: TripContextInput = {
    trip: trip.data,
    cities: cityRowsSchema.safeParse(cityResult.data).data ?? [],
    places: placeRowsSchema.safeParse(placeResult.data).data ?? [],
    similar: similar.map((s) => ({ content: s.content, similarity: s.similarity })),
  };

  const groundingAvailable = isGroundingEnabled();
  const system = buildSystemPrompt(buildTripContext(contextInput), {
    grounding: groundingAvailable,
  });
  const evidence = buildEvidenceChips(contextInput);

  // ── ⑦ 스트리밍 + grounding 도구(Phase 3) + 코스 제안 도구(Phase 4).
  //    Places 키가 없으면 도구를 **등록하지 않는다** → 모델은 텍스트로만 답한다(폴백, 설계 §7).
  //    코스 도구도 같은 조건이다 — 좌표의 출처가 Places 뿐이라 grounding 없이는 성립하지 않는다.
  const grounding = groundingAvailable
    ? createSearchPlacesTool(request.signal)
    : null;
  const course = grounding
    ? createProposeScheduleTool(
        grounding.collected,
        countDays(trip.data.start_date, trip.data.end_date),
      )
    : null;

  try {
    const result = streamText({
      model: chatModel(),
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      abortSignal: request.signal,
      ...(grounding && course
        ? {
            tools: { ...grounding.tools, ...course.tools },
            // 무한 툴콜 루프 차단 — 검색 상한(3) + 코스 제안 1 + 마무리 답변 1스텝.
            stopWhen: stepCountIs(MAX_TOOL_CALLS + 2),
          }
        : {}),
      // ★ 모델 오류는 응답 헤더가 나간 **뒤** 스트림 도중에 터진다 — 아래 try/catch 로는 못 잡는다.
      //   여기서 삼켜 unhandled rejection 을 막고, 클라는 "내용 없이 끝난 스트림"을 실패로 처리한다.
      //   (원문은 키·프롬프트를 담을 수 있어 로깅하지 않는다 — §8.5)
      onError: () => {},
    });

    const stream = toFramedStream(result.fullStream, grounding, course, () => {
      // 스트림이 끝난 뒤에야 지연·토큰이 확정된다(§6.5 허용 필드만).
      void resolveTokens(result).then((tokens) => {
        logAssistant({
          event: "chat_completed",
          tripHash,
          model: getChatModel(),
          latencyMs: Date.now() - startedAt,
          tokens,
          remaining,
        });
      });
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        [EVIDENCE_HEADER]: encodeURIComponent(JSON.stringify(evidence)),
        // 잔여 표시용(설계 §6.4) — 판정은 이미 서버에서 끝났다.
        [REMAINING_HEADER]: String(remaining),
        [LIMIT_HEADER]: String(limit),
        // 스트림이 프록시에 버퍼링되지 않게(첫 토큰 지연 방지).
        "cache-control": "no-store",
        "x-accel-buffering": "no",
      },
    });
  } catch {
    // ★ provider 원문은 키·프롬프트를 담을 수 있어 전파하지 않는다(§8.5).
    //   로그에도 원문 대신 코드만 남긴다.
    return blocked("chat_failed", 502, { tripHash });
  }
}
