"use client";

import { useEffect, useRef } from "react";

import { Icon } from "@/components/ui/icon";

import type { AssistantActions } from "../hooks/useAssistantActions";
import type { ChatMessage, EvidenceChip } from "../types";
import { CoursePlanBlock } from "./CoursePlanBlock";
import { EvidenceChips } from "./EvidenceChips";
import { RecommendationCard } from "./RecommendationCard";

/**
 * 메시지 리스트 (기획 §3 D·K, 시안 chatBody).
 * 사용자 말풍선(파랑·우측) / AI 말풍선(회색·좌측 + 아바타). 스트리밍 중에는 타이핑 점 3개.
 *
 * 접근성: `role="log"` + `aria-live="polite"` + **`aria-busy`**.
 * 스트리밍 중에는 busy=true 라 보조기술이 낭독을 보류하고, 끝나면 완성된 답변을 한 번만 읽는다
 * (델타마다 재낭독되는 문제를 DOM 을 복제하지 않고 해결한다).
 */

function AiAvatar() {
  return (
    <div className="flex size-[30px] flex-none items-center justify-center rounded-[10px] bg-gradient-to-br from-violet to-primary shadow-card">
      <Icon
        name="sparkles"
        size={17}
        strokeWidth={2}
        className="text-primary-foreground"
      />
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-start gap-2.5">
      <AiAvatar />
      <div
        className="inline-flex gap-1.5 rounded-[16px] rounded-bl-[5px] bg-secondary px-4 py-3.5"
        aria-label="답변을 작성하는 중"
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-[7px] animate-pulse rounded-full bg-mute"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </div>
    </div>
  );
}

export function MessageList({
  tripId,
  messages,
  streaming,
  evidence,
  error,
  canEdit,
  actions,
}: {
  tripId: string;
  messages: ChatMessage[];
  streaming: boolean;
  evidence: EvidenceChip[];
  error: string | null;
  canEdit: boolean;
  actions: AssistantActions;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const lastId = messages[messages.length - 1]?.id;
  const lastContent = messages[messages.length - 1]?.content;

  // 새 메시지·델타마다 하단으로 따라간다.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [lastId, lastContent, streaming]);

  const showTyping =
    streaming && messages[messages.length - 1]?.content.length === 0;

  return (
    <div
      role="log"
      aria-live="polite"
      aria-busy={streaming}
      aria-label="대화 내용"
      className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto bg-surface p-4"
    >
      {messages.length === 0 && !error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
          <div className="mb-1 flex size-14 items-center justify-center rounded-lg bg-violet-tint">
            <Icon name="sparkles" size={26} strokeWidth={2} className="text-violet" />
          </div>
          <p className="text-[15px] font-bold text-ink">무엇이든 물어보세요</p>
          <p className="max-w-[240px] text-[13px] leading-relaxed text-faint">
            담은 장소와 일정을 참고해서 답해드려요. 아래 빠른 질문으로 시작해도 좋아요.
          </p>
        </div>
      ) : null}

      {messages.map((message, i) => {
        const isLast = i === messages.length - 1;

        if (message.role === "user") {
          return (
            <div key={message.id} className="flex justify-end">
              <div className="max-w-[78%] rounded-[16px] rounded-br-[5px] bg-primary px-3.5 py-2.5 text-[13.5px] leading-relaxed font-medium text-primary-foreground shadow-primary">
                {message.content}
              </div>
            </div>
          );
        }

        const cards = message.cards ?? [];
        const course = message.course;
        if (message.content.length === 0 && cards.length === 0 && !course) {
          return null;
        }

        return (
          <div key={message.id} className="flex items-start gap-2.5">
            <AiAvatar />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              {message.content.length > 0 ? (
                <div className="rounded-[16px] rounded-bl-[5px] bg-secondary px-3.5 py-[11px] text-[13.5px] leading-relaxed font-medium whitespace-pre-wrap text-body">
                  {message.content}
                </div>
              ) : null}

              {/* 실존이 확인된 장소만 카드가 된다(설계 §4 grounding). */}
              {cards.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {cards.map((card) => (
                    <RecommendationCard
                      key={card.googlePlaceId}
                      place={card}
                      canEdit={canEdit}
                      actions={actions}
                    />
                  ))}
                </div>
              ) : null}

              {/* 코스 제안(Phase 4) — 적용 전까지는 아무것도 저장되지 않는다. */}
              {course ? (
                <CoursePlanBlock
                  tripId={tripId}
                  messageId={message.id}
                  course={course}
                  canEdit={canEdit}
                  actions={actions}
                />
              ) : null}

              {isLast && !streaming ? <EvidenceChips items={evidence} /> : null}
            </div>
          </div>
        );
      })}

      {showTyping ? <TypingDots /> : null}

      {error ? (
        <div className="flex items-start gap-2.5">
          <AiAvatar />
          <div className="rounded-[16px] rounded-bl-[5px] bg-danger-tint px-3.5 py-[11px] text-[13.5px] leading-relaxed font-medium text-danger">
            {error}
          </div>
        </div>
      ) : null}

      <div ref={endRef} />
    </div>
  );
}
