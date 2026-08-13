"use client";

import { useEffect, useRef } from "react";

import { useAssistantChat } from "../hooks/useAssistantChat";
import { AssistantComposer } from "./AssistantComposer";
import { AssistantHeader } from "./AssistantHeader";
import { MessageList } from "./MessageList";

/**
 * 어시스턴트 패널 (기획 §3 B, 시안 buildDesktop/buildMobile).
 * 데스크톱: 우측 392px 사이드 패널 / 모바일: 바텀시트.
 *
 * 접근성(기획 §11 비기능): `role="dialog"` + `aria-modal` + Esc 닫기 + 열릴 때 포커스 이동.
 * 데스크톱은 지도·일정과 나란히 놓이는 사이드 패널이라 배경을 가리는 오버레이를 두지 않고,
 * 모바일 시트에서만 딤을 깐다.
 */
export function AssistantPanel({
  tripId,
  tripTitle,
  canEdit,
  onClose,
}: {
  tripId: string;
  tripTitle: string;
  canEdit: boolean;
  onClose: () => void;
}) {
  const { messages, streaming, error, evidence, send, stop } =
    useAssistantChat(tripId);
  const panelRef = useRef<HTMLDivElement>(null);

  // Esc 로 닫기 — 스트리밍 중이면 먼저 중지한다(작업 취소 → 닫기 순서).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (streaming) {
        stop();
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [streaming, stop, onClose]);

  // 열릴 때 패널로 포커스를 옮겨 스크린리더·키보드 흐름이 이어지게 한다.
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <>
      {/*
        모바일 시트 딤 — 데스크톱에서는 배경을 가리지 않는다.
        ★ 보조기술에는 노출하지 않는다(aria-hidden + tabIndex -1): 헤더 닫기 버튼·Esc 로 이미
        닫을 수 있어, 같은 이름의 버튼이 둘이면 스크린리더에 중복으로 읽힌다.
      */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-ink/25 md:hidden"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="AI 여행 어시스턴트"
        tabIndex={-1}
        className="fixed inset-x-0 bottom-0 z-50 flex h-[85vh] flex-col overflow-hidden rounded-t-card bg-background shadow-modal outline-none md:inset-y-0 md:right-0 md:left-auto md:h-auto md:w-[392px] md:rounded-none md:border-l md:border-line md:shadow-elevated"
      >
        <AssistantHeader
          tripTitle={tripTitle}
          canEdit={canEdit}
          onClose={onClose}
        />
        <MessageList
          messages={messages}
          streaming={streaming}
          evidence={evidence}
          error={error}
          canEdit={canEdit}
        />
        <AssistantComposer
          streaming={streaming}
          canEdit={canEdit}
          onSend={(text) => void send(text)}
          onStop={stop}
        />
      </div>
    </>
  );
}
