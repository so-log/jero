"use client";

import { useState } from "react";

import { Icon } from "@/components/ui/icon";

/**
 * 메시지 하단 액션(기획 §3 I, 설계 §9). 실패 답변엔 "다시 제안", 정상 답변엔 "복사" —
 * 서로 배타적이라 한 인스턴스는 한 variant만 렌더한다.
 */
type MessageActionsProps =
  | {
      variant: "retry";
      /** 마지막 사용자 메시지를 그대로 다시 보낸다(기존 `send` 재사용 — 새 소비 경로 금지). */
      onRetry: () => void;
      disabled?: boolean;
    }
  | {
      variant: "copy";
      text: string;
    };

export function MessageActions(props: MessageActionsProps) {
  if (props.variant === "retry") {
    return <RetryAction onRetry={props.onRetry} disabled={props.disabled} />;
  }
  return <CopyAction text={props.text} />;
}

function RetryAction({
  onRetry,
  disabled,
}: {
  onRetry: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onRetry}
      disabled={disabled}
      aria-label="같은 질문으로 다시 제안받기"
      className="inline-flex h-7 w-fit items-center gap-1.5 self-start rounded-md px-2 text-[12px] font-bold text-danger transition hover:bg-danger-tint disabled:opacity-50"
    >
      <Icon name="refresh" size={13} strokeWidth={2.2} />
      다시 제안
    </button>
  );
}

function CopyAction({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 API 미지원·권한 거부 — 조용히 무시(치명적이지 않다).
    }
  };

  return (
    <button
      type="button"
      onClick={() => void onCopy()}
      aria-label={copied ? "답변이 복사됐어요" : "답변 복사"}
      className="inline-flex h-7 w-fit items-center gap-1.5 self-start rounded-md px-2 text-[12px] font-bold text-faint transition hover:bg-secondary hover:text-subtle"
    >
      <Icon name={copied ? "check" : "copy"} size={13} strokeWidth={2.2} />
      {copied ? "복사됨" : "복사"}
    </button>
  );
}
