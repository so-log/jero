"use client";

import { Icon } from "@/components/ui/icon";

/**
 * 패널 헤더 (기획 §3 C, 시안 panelHeader).
 * 아바타 + "여행 어시스턴트" + 서브텍스트 + 닫기. viewer 는 "뷰어" 배지 + "대화만 가능해요".
 * 닫기 아이콘은 데스크톱 `x`, 모바일 `chevron-down`(시트를 내리는 제스처와 일치).
 */
export function AssistantHeader({
  tripTitle,
  canEdit,
  onClose,
}: {
  tripTitle: string;
  canEdit: boolean;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-none items-center gap-2.5 border-b border-line bg-background p-4">
      {/* 시안: 보라→파랑 그라데이션 아바타(토큰 조합으로 재현). */}
      <div className="flex size-[34px] flex-none items-center justify-center rounded-[11px] bg-gradient-to-br from-violet to-primary shadow-card">
        <Icon
          name="sparkles"
          size={19}
          strokeWidth={2}
          className="text-primary-foreground"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-px">
        <div className="flex items-center gap-1.5">
          <h2 className="text-[15px] font-extrabold tracking-tight whitespace-nowrap text-ink">
            여행 어시스턴트
          </h2>
          {canEdit ? null : (
            <span className="inline-flex flex-none items-center gap-1 rounded-pill bg-secondary py-0.5 pr-2 pl-1.5">
              <Icon name="eye" size={11} strokeWidth={2.2} className="text-mute" />
              <span className="text-[10.5px] font-bold text-mute">뷰어</span>
            </span>
          )}
        </div>
        {/* 시안: "도쿄, 우리끼리 4일 · 편집 가능" / viewer 는 "대화만 가능해요". */}
        <p className="truncate text-[11.5px] font-semibold text-mute">
          {canEdit ? `${tripTitle} · 편집 가능` : "대화만 가능해요"}
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="어시스턴트 닫기"
        className="flex size-9 flex-none items-center justify-center rounded-md bg-secondary text-subtle transition hover:bg-line"
      >
        <Icon
          name="chevron-down"
          size={18}
          strokeWidth={2.2}
          className="md:hidden"
        />
        <Icon name="x" size={18} strokeWidth={2.2} className="hidden md:block" />
      </button>
    </div>
  );
}
