"use client";

import { type FormEvent, useState } from "react";

import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon";

import { MAX_MESSAGE_CHARS } from "../lib/assistantSchema";
import {
  type AssistantUsage,
  formatResetTime,
  remainingLabel,
} from "../lib/usage";

/**
 * 입력 영역 (기획 §3 J, 시안 chatFooter).
 * 빠른 질문 칩(가로 스크롤) + 입력창 + 전송. 스트리밍 중에는 전송이 "중지"로 바뀐다.
 *
 * viewer 는 실행형 질문(코스·동선)을 빼고 조회형 2개만 노출한다(기획 §7.1).
 *
 * 사용량(기획 §6): 평소엔 "오늘 N회 남음" 캡션만, **다 쓰면 입력·칩을 비활성**하고
 * 리셋 시각을 안내한다. 표시일 뿐이고 실제 차단은 서버가 한다(설계 §6.4).
 */

const QUICK_EDITOR: { label: string; icon: IconName }[] = [
  { label: "카페 추천", icon: "coffee" },
  { label: "2일 코스 짜줘", icon: "route" },
  { label: "동선 최적화", icon: "sparkles" },
  { label: "근처 맛집", icon: "utensils" },
];

const QUICK_VIEWER: { label: string; icon: IconName }[] = [
  { label: "카페 추천", icon: "coffee" },
  { label: "근처 맛집", icon: "utensils" },
];

export function AssistantComposer({
  streaming,
  canEdit,
  usage,
  onSend,
  onStop,
}: {
  streaming: boolean;
  canEdit: boolean;
  /** 서버가 알려준 잔여 사용량. 아직 응답을 못 받았으면 null(표시 안 함). */
  usage: AssistantUsage | null;
  onSend: (text: string) => void;
  onStop: () => void;
}) {
  const [value, setValue] = useState("");
  const quick = canEdit ? QUICK_EDITOR : QUICK_VIEWER;

  // 한도 소진 — 더 보내봐야 429 라 입력을 막고 언제 풀리는지 알려준다(기획 §6).
  const exhausted = usage !== null && usage.remaining <= 0;
  const locked = streaming || exhausted;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (locked || !value.trim()) return;
    onSend(value);
    setValue("");
  };

  return (
    <div className="flex flex-none flex-col gap-2.5 border-t border-line bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-4">
      {exhausted ? (
        <p
          role="status"
          className="flex items-center gap-1.5 rounded-lg bg-warn-tint px-2.5 py-2 text-[11.5px] font-semibold text-warn"
        >
          <Icon name="alert" size={13} strokeWidth={2.2} className="flex-none" />
          오늘 사용량을 다 썼어요({usage.limit}/{usage.limit}) ·{" "}
          {formatResetTime(new Date())}에 다시 채워져요
        </p>
      ) : (
        remainingLabel(usage) && (
          <p className="text-right text-[11px] font-semibold text-faint">
            {remainingLabel(usage)}
          </p>
        )
      )}

      <div className="-mb-4 flex gap-1.5 overflow-x-auto pb-4">
        {quick.map((chip) => (
          <button
            key={chip.label}
            type="button"
            disabled={locked}
            onClick={() => onSend(chip.label)}
            className="inline-flex h-[34px] flex-none items-center gap-1.5 rounded-pill border border-line bg-background px-3 transition hover:bg-secondary disabled:opacity-50"
          >
            <Icon name={chip.icon} size={13} strokeWidth={2} className="text-faint" />
            <span className="text-[12.5px] font-semibold whitespace-nowrap text-subtle">
              {chip.label}
            </span>
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex items-end gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={MAX_MESSAGE_CHARS}
          disabled={locked}
          aria-label="어시스턴트에게 질문"
          placeholder={
            exhausted ? "내일 다시 이용할 수 있어요" : "여행에 대해 무엇이든 물어보세요"
          }
          className="h-[46px] min-w-0 flex-1 rounded-lg border-[1.5px] border-line-strong bg-background px-3 text-[13.5px] font-medium text-ink placeholder:text-mute focus:border-primary focus:outline-none disabled:bg-secondary"
        />
        {streaming ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="답변 중지"
            className="flex size-[46px] flex-none items-center justify-center rounded-lg border border-line bg-background text-subtle transition hover:bg-secondary"
          >
            <Icon name="stop" size={16} strokeWidth={2.2} />
          </button>
        ) : (
          <button
            type="submit"
            disabled={locked || !value.trim()}
            aria-label="전송"
            className="flex size-[46px] flex-none items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-primary transition hover:bg-primary-hover disabled:opacity-40 disabled:shadow-none"
          >
            <Icon name="send" size={19} strokeWidth={2.2} />
          </button>
        )}
      </form>
    </div>
  );
}
