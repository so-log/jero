"use client";

import { useCallback, useRef } from "react";

import {
  MAX_HISTORY_TURNS,
  MAX_MESSAGE_CHARS,
} from "../lib/assistantSchema";
import { decodeChunk } from "../lib/streamProtocol";
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

/** 사용자에게 보여줄 일반화된 문구 — provider·서버 원문은 노출하지 않는다(§8.5). */
const ERROR_COPY: Record<string, string> = {
  rate_limited: "오늘 사용량을 다 썼어요. 내일 다시 이용할 수 있어요.",
  forbidden: "이 여행에 접근할 권한이 없어요.",
  assistant_disabled: "어시스턴트가 지금은 비활성 상태예요.",
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

async function readErrorCode(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json();
    const code = (data as { error?: unknown })?.error;
    return typeof code === "string" ? code : "default";
  } catch {
    return "default";
  }
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
          const code = await readErrorCode(response);
          setError(ERROR_COPY[code] ?? ERROR_COPY.default);
          return;
        }

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
      setEvidence,
      setStreaming,
      setError,
    ],
  );

  return { messages, streaming, error, evidence, send, stop };
}
