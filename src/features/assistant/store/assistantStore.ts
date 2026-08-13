"use client";

import { create } from "zustand";

import type { AssistantUsage } from "../lib/usage";
import type {
  ChatMessage,
  CourseApplyResult,
  CoursePlan,
  EvidenceChip,
  PlaceCard,
} from "../types";

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
  /**
   * 코스 적용 결과 — **메시지 id 별**. 패널을 닫았다 열어도 남아야 한다:
   * 남지 않으면 이미 적용한 코스에 "코스 적용" 버튼이 다시 떠 **중복 생성**으로 이어진다.
   */
  courseResults: Record<string, CourseApplyResult>;
  /**
   * 일일 사용량 — **서버가 내려준 값을 그대로 표시만** 한다(설계 §6.4).
   * 응답을 한 번도 못 받은 상태(null)에서는 아무것도 표시하지 않는다(추측 금지).
   */
  usage: AssistantUsage | null;

  openPanel: () => void;
  closePanel: () => void;
  appendMessage: (message: ChatMessage) => void;
  /** 스트리밍 중 마지막 어시스턴트 메시지에 델타를 이어붙인다. */
  appendDelta: (id: string, delta: string) => void;
  /** 내용 없이 끝난 답변 자리표시자를 걷어낸다(스트림 도중 실패). */
  dropMessage: (id: string) => void;
  /** grounding 을 통과한 추천 카드를 해당 답변에 붙인다(Phase 3). */
  setCards: (id: string, cards: PlaceCard[]) => void;
  /** Zod 재검증을 통과한 코스 제안을 해당 답변에 붙인다(Phase 4). */
  setCourse: (id: string, course: CoursePlan) => void;
  setUsage: (usage: AssistantUsage) => void;
  /** 코스 적용 결과를 기록한다(되돌리기·중복 적용 방지의 근거). */
  setCourseResult: (id: string, result: CourseApplyResult) => void;
  /** 되돌리기 완료 — 다시 적용할 수 있는 상태로 되돌린다. */
  clearCourseResult: (id: string) => void;
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
  courseResults: {},
  usage: null,

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

  setCourse: (id, course) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, course } : m)),
    })),

  setCourseResult: (id, result) =>
    set((s) => ({ courseResults: { ...s.courseResults, [id]: result } })),

  clearCourseResult: (id) =>
    set((s) => {
      const next = { ...s.courseResults };
      delete next[id];
      return { courseResults: next };
    }),

  setUsage: (usage) => set({ usage }),

  setEvidence: (evidence) => set({ evidence }),
  setStreaming: (streaming) => set({ streaming }),
  setError: (error) => set({ error, streaming: false }),

  reset: () =>
    set({
      messages: [],
      evidence: [],
      streaming: false,
      error: null,
      courseResults: {},
      // ★ usage 는 지우지 않는다 — 대화를 비워도 서버 카운터는 그대로다(표시가 되살아나면 거짓말).
    }),
}));
