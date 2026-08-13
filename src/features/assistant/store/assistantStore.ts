"use client";

import { create } from "zustand";

import type { ChatMessage, EvidenceChip, PlaceCard } from "../types";

/**
 * 어시스턴트 UI 상태 (설계 §10). **비영속** — 패널을 닫거나 새로고침하면 대화가 사라진다.
 * 대화 로그를 DB 에 저장하지 않기로 한 결정(계약 C0-C5)과 일치한다.
 *
 * 서버 상태(장소·일정)는 여기 두지 않는다 — 기존 `['places', tripId]` TanStack Query 그대로.
 */
interface AssistantState {
  open: boolean;
  messages: ChatMessage[];
  /** 마지막 답변의 근거 칩(서버가 실제 참고한 것). */
  evidence: EvidenceChip[];
  /** 스트리밍 진행 중 — 입력·전송 비활성 및 중지 버튼 노출. */
  streaming: boolean;
  /** 사용자에게 보여줄 일반화된 에러 문구(§8.5 — 원문 노출 금지). */
  error: string | null;

  openPanel: () => void;
  closePanel: () => void;
  appendMessage: (message: ChatMessage) => void;
  /** 스트리밍 중 마지막 어시스턴트 메시지에 델타를 이어붙인다. */
  appendDelta: (id: string, delta: string) => void;
  /** 내용 없이 끝난 답변 자리표시자를 걷어낸다(스트림 도중 실패). */
  dropMessage: (id: string) => void;
  /** grounding 을 통과한 추천 카드를 해당 답변에 붙인다(Phase 3). */
  setCards: (id: string, cards: PlaceCard[]) => void;
  setEvidence: (evidence: EvidenceChip[]) => void;
  setStreaming: (streaming: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useAssistantStore = create<AssistantState>((set) => ({
  open: false,
  messages: [],
  evidence: [],
  streaming: false,
  error: null,

  openPanel: () => set({ open: true }),
  closePanel: () => set({ open: false }),

  appendMessage: (message) =>
    set((s) => ({ messages: [...s.messages, message], error: null })),

  appendDelta: (id, delta) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + delta } : m,
      ),
    })),

  dropMessage: (id) =>
    set((s) => ({ messages: s.messages.filter((m) => m.id !== id) })),

  setCards: (id, cards) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, cards } : m)),
    })),

  setEvidence: (evidence) => set({ evidence }),
  setStreaming: (streaming) => set({ streaming }),
  setError: (error) => set({ error, streaming: false }),

  reset: () => set({ messages: [], evidence: [], streaming: false, error: null }),
}));
