"use client";

import { useState } from "react";

import { Icon } from "@/components/ui/icon";
import type { TripDto } from "@/features/itinerary/types";
import { formatPeriod } from "@/lib/tripDate";
import { cn } from "@/lib/utils";
import { useOverlayStore } from "@/store/overlayStore";

import { useWorkspaceView, WORKSPACE_VIEWS } from "../hooks/useWorkspaceView";
import { WorkspaceTabDrawer } from "./WorkspaceTabDrawer";

/**
 * 모바일 워크스페이스 상단 바(반응형 3-A) — 햄버거 · 여행 제목(현재 탭·기간) · 공유. 3영역 고정, 탭타깃 44px+.
 * md+ 에선 숨김(데스크톱은 WorkspaceTopBar). 라우팅(?view=)·공유는 기존 경로 그대로.
 */
interface WorkspaceMobileBarProps {
  trip: TripDto;
  canEdit: boolean;
}

export function WorkspaceMobileBar({ trip, canEdit }: WorkspaceMobileBarProps) {
  const { current } = useWorkspaceView();
  const openOverlay = useOverlayStore((s) => s.open);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const period = formatPeriod(trip.start_date, trip.end_date);
  const currentLabel =
    WORKSPACE_VIEWS.find((v) => v.value === current)?.label ?? "";

  return (
    <header className="relative z-30 flex h-14 flex-none items-center gap-1 border-b border-line bg-background px-1.5 md:hidden">
      <button
        type="button"
        aria-label="메뉴 열기"
        aria-haspopup="dialog"
        aria-expanded={drawerOpen}
        onClick={() => setDrawerOpen(true)}
        className="flex size-11 flex-none items-center justify-center rounded-xl text-ink transition-colors hover:bg-secondary"
      >
        <Icon name="menu" size={23} strokeWidth={2} />
      </button>

      <div className="flex min-w-0 flex-1 flex-col items-center">
        <span className="max-w-[210px] truncate text-[15.5px] font-extrabold tracking-tight text-ink">
          {trip.title}
        </span>
        <div className="mt-px flex items-center gap-1.5">
          <span
            className={cn(
              "text-[12px] font-bold whitespace-nowrap",
              current !== "plan" ? "text-primary" : "text-faint",
            )}
          >
            {currentLabel}
          </span>
          <span className="size-[3px] flex-none rounded-full bg-mute" />
          <span className="text-[11.5px] font-semibold whitespace-nowrap text-faint">
            {period}
          </span>
        </div>
      </div>

      {canEdit ? (
        <button
          type="button"
          aria-label="공유"
          onClick={() => openOverlay("share")}
          className="flex size-11 flex-none items-center justify-center rounded-xl text-ink transition-colors hover:bg-secondary"
        >
          <Icon name="share" size={21} strokeWidth={2} />
        </button>
      ) : (
        <span
          aria-label="보기 전용"
          className="flex size-11 flex-none items-center justify-center text-faint"
        >
          <Icon name="eye" size={20} strokeWidth={2} />
        </span>
      )}

      <WorkspaceTabDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        trip={trip}
        canEdit={canEdit}
      />
    </header>
  );
}
