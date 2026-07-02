"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Icon, type IconName } from "./icon";

/**
 * 공용 모달 셸(10) — ConfirmDialog 와 같은 base-ui 기반(focus trap·Escape·backdrop·접근성).
 * 세 오버레이(#place 우측 패널 / #share·#expense 중앙 모달)가 이 셸 위에 얹힌다. 중복 구현 금지(설계 §9).
 */
type IconTone = "primary" | "success";

const TONE: Record<IconTone, { bg: string; fg: string }> = {
  primary: { bg: "var(--color-primary-tint)", fg: "var(--color-primary-hover)" },
  success: { bg: "var(--color-success-tint)", fg: "var(--color-success)" },
};

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconTone?: IconTone;
  /** 모달 폭(px). panel 변형이면 우측 시트 폭. */
  width?: number;
  variant?: "modal" | "panel";
  /** 상단 에러 배너(검증 실패 등). */
  banner?: string | null;
  loading?: boolean;
  loadingText?: string;
  footer?: ReactNode;
  children: ReactNode;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  subtitle,
  icon,
  iconTone = "primary",
  width = 480,
  variant = "modal",
  banner,
  loading = false,
  loadingText = "저장하는 중…",
  footer,
  children,
}: DialogProps) {
  const tone = TONE[iconTone];
  const panel = variant === "panel";

  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm" />
        <BaseDialog.Popup
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden bg-background shadow-modal outline-none",
            panel
              ? "top-0 right-0 h-full max-w-[calc(100vw-32px)] rounded-l-card"
              : "top-1/2 left-1/2 max-h-[88vh] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 rounded-card",
          )}
          style={{ width }}
        >
          {/* 헤더 */}
          <div className="flex flex-none items-center justify-between gap-3 border-b border-line p-[18px_20px]">
            <div className="flex min-w-0 items-center gap-2.5">
              {icon && (
                <span
                  className="flex size-9 flex-none items-center justify-center rounded-md"
                  style={{ background: tone.bg, color: tone.fg }}
                >
                  <Icon name={icon} size={19} strokeWidth={2} />
                </span>
              )}
              <div className="flex min-w-0 flex-col">
                <BaseDialog.Title className="text-base font-extrabold tracking-tight text-ink">
                  {title}
                </BaseDialog.Title>
                {subtitle && (
                  <span className="truncate text-[12.5px] font-medium text-faint">
                    {subtitle}
                  </span>
                )}
              </div>
            </div>
            <BaseDialog.Close className="flex size-[34px] flex-none items-center justify-center rounded-md bg-secondary text-faint hover:bg-line hover:text-subtle">
              <Icon name="x" size={18} strokeWidth={2.2} />
            </BaseDialog.Close>
          </div>

          {/* 본문 */}
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
            {banner && (
              <div className="flex items-center gap-2.5 rounded-md border border-danger/30 bg-danger-tint px-3.5 py-2.5">
                <Icon name="alert" size={17} strokeWidth={2.2} className="flex-none text-danger" />
                <span className="text-[13px] font-semibold text-danger">{banner}</span>
              </div>
            )}
            {children}
          </div>

          {/* 푸터 */}
          {footer && (
            <div className="flex flex-none items-center gap-2.5 border-t border-line p-[14px_20px]">
              {footer}
            </div>
          )}

          {/* 로딩 오버레이 */}
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/90 backdrop-blur-sm">
              <span className="size-[38px] animate-spin rounded-full border-[3.5px] border-primary-tint border-t-primary" />
              <span className="text-sm font-bold text-ink">{loadingText}</span>
            </div>
          )}
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
