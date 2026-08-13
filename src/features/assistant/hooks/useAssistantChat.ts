"use client";

import { useCallback, useRef } from "react";

import {
  coursePlanSchema,
  MAX_HISTORY_TURNS,
  MAX_MESSAGE_CHARS,
} from "../lib/assistantSchema";
import { decodeChunk } from "../lib/streamProtocol";
import type { AssistantUsage } from "../lib/usage";
import { useAssistantStore } from "../store/assistantStore";
import type { ChatMessage, EvidenceChip } from "../types";

/**
 * 챗 스트리밍 훅 (설계 §2). 컴포넌트는 이 훅만 쓴다 — 직접 fetch 금지(§7.1).
 *
 * 서버 스트림은 텍스트 사이에 카드 프레임이 끼어 있는 형식이다(`streamProtocol.ts`).
 * 여기서 읽어 텍스트는 말풍선에, 프레임은 추천 카드로 나눠 담는다.
 * (AI SDK 의 `useChat` 은 별도 패키지 `@ai-sdk/react` 가 필요해 도입하지 않았다 — 프로토콜을
 *  양쪽 다 우리가 정의하므로 단순하고 검증도 쉽다.)
 */

const EVIDENCE_HEADER = "x-assistant-evidence";
const REMAINING_HEADER = "x-assistant-remaining";
const LIMIT_HEADER = "x-assistant-limit";

/**
 * 사용자에게 보여줄 일반화된 문구 — provider·서버 원문은 노출하지 않는다(§8.5).
 * ★ 서버가 내려보내는 코드는 **여기 있는 어휘뿐**이고, 목록에 없으면 `default` 로 떨어진다.
 *   새 코드가 생겨도 원문이 새는 일은 없다(모르는 코드 = 일반 문구).
 */
const ERROR_COPY: Record<string, string> = {
  /*
   * ★ 말풍선은 "방금 무슨 일이 일어났는지"만 짧게 말한다.
   *   정확한 한도(N/N)와 리셋 시각은 **입력창 배너**가 맡는다(`AssistantComposer`) —
   *   같은 문장을 두 곳에 띄우면 화면만 시끄럽고, 안내는 입력이 잠긴 자리에 붙어야 읽힌다.
   */
  rate_limited: "오늘 사용량을 다 썼어요. 내일 다시 이용할 수 있어요.",
  forbidden: "이 여행에 접근할 권한이 없어요.",
  unauthorized: "로그인이 필요해요. 다시 로그인한 뒤 시도해주세요.",
  assistant_disabled: "어시스턴트가 지금은 비활성 상태예요.",
  supabase_disabled: "어시스턴트가 지금은 비활성 상태예요.",
  default: "지금은 답할 수 없어요. 잠시 후 다시 시도해주세요.",
};

function parseEvidence(header: string | null): EvidenceChip[] {
  if (!header) return [];
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(header));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c): c is EvidenceChip =>
        typeof c === "object" &&
        c !== null &&
        typeof (c as EvidenceChip).label === "string",
    );
  } catch {
    return []; // 근거 칩은 부가 정보 — 파싱 실패로 답변을 막지 않는다.
  }
}

interface ErrorPayload {
  code: string;
  /** 429 일 때 서버가 함께 주는 사용량(잔여·한도) — "N/N" 문구와 리셋 안내에 쓴다. */
  usage: AssistantUsage | null;
}

async function readErrorPayload(response: Response): Promise<ErrorPayload> {
  try {
    const data: unknown = await response.json();
    const body = data as { error?: unknown; remaining?: unknown; limit?: unknown };
    const code = typeof body?.error === "string" ? body.error : "default";
    const usage =
      typeof body?.remaining === "number" && typeof body?.limit === "number"
        ? { remaining: body.remaining, limit: body.limit }
        : null;
    return { code, usage };
  } catch {
    return { code: "default", usage: null };
  }
}

/** 성공 응답 헤더의 잔여 사용량(설계 §6.4 — 클라는 표시만). */
function parseUsage(response: Response): AssistantUsage | null {
  const remaining = Number(response.headers.get(REMAINING_HEADER));
  const limit = Number(response.headers.get(LIMIT_HEADER));
  if (!Number.isFinite(remaining) || !Number.isFinite(limit) || limit <= 0) {
    return null;
  }
  return { remaining, limit };
}

let messageSeq = 0;
function nextId(prefix: string): string {
  messageSeq += 1;
  return `${prefix}_${messageSeq}`;
}

export function useAssistantChat(tripId: string) {
  const messages = useAssistantStore((s) => s.messages);
  const streaming = useAssistantStore((s) => s.streaming);
  const error = useAssistantStore((s) => s.error);
  const evidence = useAssistantStore((s) => s.evidence);
  const appendMessage = useAssistantStore((s) => s.appendMessage);
  const appendDelta = useAssistantStore((s) => s.appendDelta);
  const dropMessage = useAssistantStore((s) => s.dropMessage);
  const setCards = useAssistantStore((s) => s.setCards);
  const setCourse = useAssistantStore((s) => s.setCourse);
  const usage = useAssistantStore((s) => s.usage);
  const setUsage = useAssistantStore((s) => s.setUsage);
  const setEvidence = useAssistantStore((s) => s.setEvidence);
  const setStreaming = useAssistantStore((s) => s.setStreaming);
  const setError = useAssistantStore((s) => s.setError);

  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }, [setStreaming]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim().slice(0, MAX_MESSAGE_CHARS);
      if (!trimmed || useAssistantStore.getState().streaming) return;

      const userMessage: ChatMessage = {
        id: nextId("u"),
        role: "user",
        content: trimmed,
      };
      appendMessage(userMessage);
      setEvidence([]);
      setStreaming(true);

      // 최근 N턴만 전송(설계 §3.4 비용·지연 관리). 방금 넣은 사용자 메시지 포함.
      const history = [...useAssistantStore.getState().messages].slice(
        -MAX_HISTORY_TURNS,
      );

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/assistant/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            tripId,
            messages: history.map((m) => ({ role: m.role, content: m.content })),
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          const { code, usage: blockedUsage } = await readErrorPayload(response);
          // 429 가 함께 준 잔여·한도 → 입력창 배너가 N/N·리셋 시각을 그린다.
          if (blockedUsage) setUsage(blockedUsage);
          setError(ERROR_COPY[code] ?? ERROR_COPY.default);
          return;
        }

        // 헤더가 없으면 **표시하지 않는다** — 0으로 넘겨짚으면 멀쩡한데 "다 썼어요"가 뜬다.
        const freshUsage = parseUsage(response);
        if (freshUsage) setUsage(freshUsage);
        setEvidence(parseEvidence(response.headers.get(EVIDENCE_HEADER)));

        const assistantId = nextId("a");
        appendMessage({ id: assistantId, role: "assistant", content: "" });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let received = 0;
        let pending = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          // 텍스트와 카드 프레임을 분리한다(프레임이 청크 경계에 걸릴 수 있어 pending 을 이어 넘긴다).
          const chunk = decodeChunk(decoder.decode(value, { stream: true }), pending);
          pending = chunk.pending;

          if (chunk.text) {
            received += chunk.text.length;
            appendDelta(assistantId, chunk.text);
          }
          for (const frame of chunk.frames) {
            if (frame.cards?.length) {
              received += 1; // 카드만 오고 텍스트가 없어도 "응답 있음"으로 본다.
              setCards(assistantId, frame.cards);
            }
            if (frame.course) {
              // ★ 모델 출력은 렌더 직전에 다시 검증한다(설계 §6.3). 좌표 없는 항목이 하나라도
              //   섞이면 스키마가 통째로 떨어지고 **코스 블록만 생략**된다 — 텍스트 답변은 남는다(§7).
              const parsed = coursePlanSchema.safeParse(frame.course);
              if (parsed.success) {
                received += 1;
                setCourse(assistantId, parsed.data);
              }
            }
          }
        }

        // ★ 모델 오류는 200 헤더가 나간 뒤 스트림 도중에 터진다 — 그러면 내용 없이 끝난다.
        //   빈 답변을 말풍선으로 남기면 "무응답"처럼 보이므로 실패로 처리한다.
        if (received === 0) {
          dropMessage(assistantId);
          setError(ERROR_COPY.default);
          return;
        }
        setStreaming(false);
      } catch (err) {
        // 사용자가 "중지"를 눌러 abort 한 것은 에러가 아니다 — 부분 답변을 남긴다.
        if (err instanceof DOMException && err.name === "AbortError") {
          setStreaming(false);
          return;
        }
        setError(ERROR_COPY.default);
      } finally {
        abortRef.current = null;
      }
    },
    [
      tripId,
      appendMessage,
      appendDelta,
      dropMessage,
      setCards,
      setCourse,
      setEvidence,
      setUsage,
      setStreaming,
      setError,
    ],
  );

  return { messages, streaming, error, evidence, usage, send, stop };
}
