"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";

import { cn } from "@/lib/utils";

import { Button } from "./button";
import { Icon } from "./icon";

/**
 * 확인 다이얼로그 — 공용(결정 D). 09 계정 삭제가 첫 소비자, 10 장소·지출 삭제가 재사용.
 * variant='destructive' 면 위험 톤(빨강 메달리언 + destructive 확인 버튼).
 * 파괴적 동작은 UI 확인일 뿐 — 서버에서 인증·소유 재확인이 최종 강제다(§8.7).
 */
export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "취소",
  variant = "default",
  onConfirm,
}: ConfirmDialogProps) {
  const destructive = variant === "destructive";
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm" />
        <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-50 flex w-[420px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-card border border-line bg-background p-6 shadow-modal outline-none">
          <span
            className={cn(
              "flex size-12 items-center justify-center rounded-lg",
              destructive
                ? "bg-danger-tint text-danger"
                : "bg-primary-tint text-primary-hover",
            )}
          >
            <Icon name={destructive ? "alert" : "info"} size={24} strokeWidth={2} />
          </span>
          <AlertDialog.Title className="text-lg font-extrabold tracking-tight text-ink">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="text-[13.5px] leading-relaxed font-medium text-subtle">
            {description}
          </AlertDialog.Description>
          <div className="mt-2 flex justify-end gap-2.5">
            <AlertDialog.Close
              render={<Button variant="secondary" size="sm" />}
            >
              {cancelLabel}
            </AlertDialog.Close>
            <Button
              variant={destructive ? "destructive" : "primary"}
              size="sm"
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
