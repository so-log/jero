"use client";

import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/ui/icon";

/** 계정 관리 섹션 — 로그아웃 + 계정 삭제(ConfirmDialog 공용). 시안 account. */
export function AccountSection({
  onLogout,
  onDeleteAccount,
}: {
  onLogout: () => void;
  onDeleteAccount: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <section id="section-account" className="flex flex-col gap-3.5">
      <h2 className="text-base font-extrabold tracking-tight text-ink">계정 관리</h2>

      <div className="overflow-hidden rounded-panel border border-line bg-background">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 border-b border-line p-[18px] text-left hover:bg-surface"
        >
          <span className="flex size-[38px] flex-none items-center justify-center rounded-md bg-secondary text-subtle">
            <Icon name="log-out" size={19} strokeWidth={2} />
          </span>
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="text-sm font-bold text-body">로그아웃</span>
            <span className="text-[12.5px] font-medium text-faint">
              이 기기에서 로그아웃해요
            </span>
          </div>
          <Icon name="chevron-right" size={18} strokeWidth={2.2} className="text-mute" />
        </button>

        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="flex w-full items-center gap-3 p-[18px] text-left hover:bg-danger-tint/40"
        >
          <span className="flex size-[38px] flex-none items-center justify-center rounded-md bg-danger-tint text-danger">
            <Icon name="trash" size={19} strokeWidth={2} />
          </span>
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="text-sm font-bold text-danger">계정 삭제</span>
            <span className="text-[12.5px] font-medium text-danger/70">
              모든 여행과 데이터가 영구 삭제돼요
            </span>
          </div>
          <Icon name="chevron-right" size={18} strokeWidth={2.2} className="text-danger/40" />
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        variant="destructive"
        title="정말 계정을 삭제할까요?"
        description="계정을 삭제하면 내가 만든 모든 여행과 저장한 장소, 지출 기록이 영구적으로 사라져요. 이 작업은 되돌릴 수 없어요."
        confirmLabel="삭제할게요"
        onConfirm={onDeleteAccount}
      />
    </section>
  );
}
