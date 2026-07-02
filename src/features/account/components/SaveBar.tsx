"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

/** 하단 저장 바 — 상태 안내 + 되돌리기 + 변경사항 저장. 시안 save bar. */
export type SaveStatus = "idle" | "saving" | "saved" | "error";

export function SaveBar({
  status,
  dirty,
  onReset,
  onSave,
}: {
  status: SaveStatus;
  dirty: boolean;
  onReset: () => void;
  onSave: () => void;
}) {
  return (
    <div className="flex h-[70px] flex-none items-center justify-between border-t border-line bg-background px-9">
      <StatusText status={status} />
      <div className="flex items-center gap-2.5">
        <Button
          variant="secondary"
          onClick={onReset}
          disabled={!dirty || status === "saving"}
          className="h-[42px]"
        >
          되돌리기
        </Button>
        <Button
          variant="primary"
          onClick={onSave}
          disabled={!dirty || status === "saving"}
          className="h-[42px]"
        >
          {status === "saving" ? "저장 중…" : "변경사항 저장"}
        </Button>
      </div>
    </div>
  );
}

function StatusText({ status }: { status: SaveStatus }) {
  if (status === "saving") {
    return (
      <span className="flex items-center gap-2 text-[13.5px] font-semibold text-subtle">
        <span className="size-[18px] animate-spin rounded-full border-[2.5px] border-primary-tint border-t-primary" />
        변경사항을 저장하는 중…
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="flex items-center gap-2 text-[13.5px] font-bold text-success">
        <span className="flex size-[22px] items-center justify-center rounded-full bg-success-tint">
          <Icon name="check" size={14} strokeWidth={2.8} />
        </span>
        모든 변경사항이 저장되었어요
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex items-center gap-2 text-[13.5px] font-bold text-danger">
        <span className="flex size-[22px] items-center justify-center rounded-full bg-danger-tint">
          <Icon name="alert" size={14} strokeWidth={2.4} />
        </span>
        저장에 실패했어요. 다시 시도해 주세요.
      </span>
    );
  }
  return (
    <span className="text-[13px] font-medium text-faint">
      변경사항은 저장을 눌러야 적용돼요
    </span>
  );
}
