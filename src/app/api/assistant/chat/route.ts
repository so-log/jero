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
  isAssistantEnabled,
  isGroundingEnabled,
} from "@/lib/ai/env";
import { chatModel } from "@/lib/ai/provider";
import { searchSimilarPlaces } from "@/lib/ai/retrieve";
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

/**
 * 모델 스트림 → 클라 와이어 포맷 변환 (`streamProtocol.ts`).
 *
 * 텍스트 델타는 그대로 흘리고, 스트림이 끝나면 **Places 가 확인해준 장소만** 카드 프레임으로 덧붙인다.
 *
 * ★ grounding 2중 방어의 서버측: 카드 목록의 출처는 모델 출력이 아니라 **도구가 수집한 `collected`** 다.
 *   모델이 본문에 어떤 이름을 지어내든 이 배열에 없으면 카드가 되지 않는다.
 */
function toFramedStream(fullStream: FullStream, grounding: Grounding): ReadableStream<Uint8Array> {
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
      if (cards.length > 0) {
        controller.enqueue(encoder.encode(encodeFrame({ cards })));
      }
      controller.close();
    },
  });
}

export async function POST(request: Request) {
  if (!hasSupabase) {
    return NextResponse.json({ error: "supabase_disabled" }, { status: 503 });
  }
  if (!isAssistantEnabled()) {
    return NextResponse.json({ error: "assistant_disabled" }, { status: 503 });
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = chatRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 422 });
  }
  const { tripId, messages } = parsed.data;

  // ── ④ 멤버십: trip 단건 조회가 RLS(trip_select = is_trip_member)로 걸러진다.
  //    클라가 보낸 tripId 를 신뢰하지 않고 여기서 실제 접근 권한을 확인한다(§8.2).
  const { data: tripRow, error: tripError } = await supabase
    .from("trip")
    .select("title, start_date, end_date, country, region")
    .eq("id", tripId)
    .maybeSingle();
  if (tripError) {
    return NextResponse.json({ error: "trip_lookup_failed" }, { status: 500 });
  }
  const trip = tripRowSchema.safeParse(tripRow);
  if (!trip.success) {
    // 비멤버거나 없는 여행 — 존재 여부를 구분해 알려주지 않는다.
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // ── ⑤ rate limit: 원자적 소비(계약 C6). 한도 초과면 모델을 호출하지 않는다.
  const { data: quotaRows, error: quotaError } = await supabase.rpc(
    "consume_assistant_quota",
    { p_limit: getAssistantDailyLimit() },
  );
  if (quotaError) {
    return NextResponse.json({ error: "quota_failed" }, { status: 500 });
  }
  const quota = z
    .array(z.object({ allowed: z.boolean(), remaining: z.number() }))
    .safeParse(quotaRows);
  if (!quota.success || !quota.data[0]) {
    return NextResponse.json({ error: "quota_failed" }, { status: 500 });
  }
  if (!quota.data[0].allowed) {
    return NextResponse.json(
      { error: "rate_limited", remaining: 0 },
      { status: 429 },
    );
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

  // ── ⑦ 스트리밍 + grounding 도구(Phase 3).
  //    Places 키가 없으면 도구를 **등록하지 않는다** → 모델은 텍스트로만 답한다(폴백, 설계 §7).
  const grounding = groundingAvailable
    ? createSearchPlacesTool(request.signal)
    : null;

  try {
    const result = streamText({
      model: chatModel(),
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      abortSignal: request.signal,
      ...(grounding
        ? {
            tools: grounding.tools,
            // 무한 툴콜 루프 차단 — 도구 호출 상한(3) + 마무리 답변 1스텝.
            stopWhen: stepCountIs(MAX_TOOL_CALLS + 1),
          }
        : {}),
      // ★ 모델 오류는 응답 헤더가 나간 **뒤** 스트림 도중에 터진다 — 아래 try/catch 로는 못 잡는다.
      //   여기서 삼켜 unhandled rejection 을 막고, 클라는 "내용 없이 끝난 스트림"을 실패로 처리한다.
      //   (원문은 키·프롬프트를 담을 수 있어 로깅하지 않는다 — §8.5)
      onError: () => {},
    });

    return new Response(toFramedStream(result.fullStream, grounding), {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        [EVIDENCE_HEADER]: encodeURIComponent(JSON.stringify(evidence)),
        // 스트림이 프록시에 버퍼링되지 않게(첫 토큰 지연 방지).
        "cache-control": "no-store",
        "x-accel-buffering": "no",
      },
    });
  } catch {
    // ★ provider 원문은 키·프롬프트를 담을 수 있어 전파하지 않는다(§8.5).
    return NextResponse.json({ error: "chat_failed" }, { status: 502 });
  }
}
