"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import type { TripDto } from "@/features/itinerary/types";
import { formatPeriod, nightsDays } from "@/lib/tripDate";
import { cn } from "@/lib/utils";
import { useOverlayStore } from "@/store/overlayStore";

import { useWorkspaceView, WORKSPACE_VIEWS } from "../hooks/useWorkspaceView";

/**
 * 모바일 탭 드로어(반응형 3-A) — 왼쪽 오프캔버스. base-ui Dialog 로 포커스 트랩·ESC·백드롭·바깥클릭 닫기(접근성).
 * 5개 뷰(플랜/캘린더/장소/예산/통계) 전체 표시(탭 잘림 없음) + 목록/공유. 라우팅은 useWorkspaceView 공유.
 * md+ 에선 숨김(데스크톱은 인라인 ViewSegment). 권한 강제는 서버/RLS — canEdit 은 UI 노출 분기.
 */
interface WorkspaceTabDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: TripDto;
  canEdit: boolean;
}

export function WorkspaceTabDrawer({
  open,
  onOpenChange,
  trip,
  canEdit,
}: WorkspaceTabDrawerProps) {
  const { current, go } = useWorkspaceView();
  const openOverlay = useOverlayStore((s) => s.open);
  const period = formatPeriod(trip.start_date, trip.end_date);
  const { label: nights } = nightsDays(trip.start_date, trip.end_date);

  const select = (view: (typeof WORKSPACE_VIEWS)[number]["value"]) => {
    go(view);
    onOpenChange(false);
  };

  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm md:hidden" />
        <BaseDialog.Popup className="fixed top-0 left-0 z-50 flex h-full w-[274px] max-w-[85vw] flex-col bg-background shadow-[2px_0_24px_-6px_color-mix(in_srgb,var(--color-ink)_30%,transparent)] outline-none md:hidden">
          {/* 헤더 — jero 로고 + 여행 정보 */}
          <div className="flex-none border-b border-line p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-md bg-gradient-to-br from-[#6E9CF2] to-[#8FBCF7] text-white shadow-[0_4px_10px_-2px_color-mix(in_srgb,#5B8DEF_50%,transparent)]">
                  <Icon name="map-pin" size={17} strokeWidth={2.4} />
                </span>
                <span className="text-[18px] font-extrabold tracking-tight text-ink">
                  jero
                </span>
              </div>
              <BaseDialog.Close
                aria-label="메뉴 닫기"
                className="flex size-9 items-center justify-center rounded-md bg-secondary text-subtle hover:bg-line"
              >
                <Icon name="x" size={18} strokeWidth={2.2} />
              </BaseDialog.Close>
            </div>
            <div className="mt-3.5 flex items-center gap-2.5">
              <span className="flex size-[38px] flex-none items-center justify-center rounded-lg bg-primary-tint text-primary">
                <Icon name={trip.cover_icon} size={19} strokeWidth={2} />
              </span>
              <div className="flex min-w-0 flex-col">
                <BaseDialog.Title className="truncate text-[14.5px] font-extrabold text-ink">
                  {trip.title}
                </BaseDialog.Title>
                <span className="text-[11.5px] font-semibold text-faint">
                  {period} · {nights}
                </span>
              </div>
            </div>
          </div>

          {/* 5개 뷰 */}
          <nav
            aria-label="뷰 전환"
            className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2.5"
          >
            {WORKSPACE_VIEWS.map((v) => {
              const active = v.value === current;
              return (
                <button
                  key={v.value}
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => select(v.value)}
                  className={cn(
                    "flex h-12 w-full items-center gap-3 rounded-lg px-3.5 text-left transition-colors",
                    active ? "bg-primary-tint" : "hover:bg-secondary",
                  )}
                >
                  <Icon
                    name={v.icon}
                    size={21}
                    strokeWidth={2}
                    className={active ? "text-primary" : "text-mute"}
                  />
                  <span
                    className={cn(
                      "flex-1 text-[15px]",
                      active ? "font-bold text-ink" : "font-semibold text-body",
                    )}
                  >
                    {v.label}
                  </span>
                  {active && <span className="size-[7px] rounded-full bg-primary" />}
                </button>
              );
            })}
          </nav>

          {/* 푸터 — 목록 / 공유·멤버 */}
          <div className="flex-none border-t border-line p-2.5">
            <Link
              href="/trips"
              onClick={() => onOpenChange(false)}
              className="flex h-11 w-full items-center gap-3 rounded-lg px-3.5 text-[14px] font-semibold text-subtle transition-colors hover:bg-secondary"
            >
              <Icon name="arrow-left" size={19} strokeWidth={2} className="text-mute" />
              여행 목록으로
            </Link>
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  openOverlay("share");
                }}
                className="flex h-11 w-full items-center gap-3 rounded-lg px-3.5 text-left text-[14px] font-semibold text-subtle transition-colors hover:bg-secondary"
              >
                <Icon name="users" size={19} strokeWidth={2} className="text-mute" />
                공유 및 멤버
              </button>
            )}
          </div>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
