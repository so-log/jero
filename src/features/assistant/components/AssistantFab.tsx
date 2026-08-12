"use client";

import { Icon } from "@/components/ui/icon";

/**
 * 어시스턴트 진입 FAB (기획 §3 A, 시안 "AI 어시스턴트.dc.html").
 * 데스크톱: 알약형 + "AI에게 묻기" / 모바일: 56px 원형(아이콘만).
 * 패널이 열려 있으면 렌더하지 않는다(시안 동작).
 */
export function AssistantFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="AI 여행 어시스턴트 열기"
      className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-40 flex size-14 items-center justify-center rounded-pill bg-primary text-primary-foreground shadow-primary transition hover:bg-primary-hover md:right-6 md:bottom-6 md:size-auto md:h-13 md:gap-2 md:px-5 md:pl-4"
    >
      <Icon name="sparkles" size={22} strokeWidth={2.2} className="md:size-5" />
      <span className="hidden text-sm font-bold md:inline">AI에게 묻기</span>
    </button>
  );
}
