"use client";

import { type FormEvent, useState } from "react";

import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon";

import { MAX_MESSAGE_CHARS } from "../lib/assistantSchema";

/**
 * 입력 영역 (기획 §3 J, 시안 chatFooter).
 * 빠른 질문 칩(가로 스크롤) + 입력창 + 전송. 스트리밍 중에는 전송이 "중지"로 바뀐다.
 *
 * viewer 는 실행형 질문(코스·동선)을 빼고 조회형 2개만 노출한다(기획 §7.1).
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
  onSend,
  onStop,
}: {
  streaming: boolean;
  canEdit: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}) {
  const [value, setValue] = useState("");
  const quick = canEdit ? QUICK_EDITOR : QUICK_VIEWER;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (streaming || !value.trim()) return;
    onSend(value);
    setValue("");
  };

  return (
    <div className="flex flex-none flex-col gap-2.5 border-t border-line bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-4">
      <div className="-mb-4 flex gap-1.5 overflow-x-auto pb-4">
        {quick.map((chip) => (
          <button
            key={chip.label}
            type="button"
            disabled={streaming}
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
          disabled={streaming}
          aria-label="어시스턴트에게 질문"
          placeholder="여행에 대해 무엇이든 물어보세요"
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
            disabled={!value.trim()}
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
