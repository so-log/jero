"use client";

import Link from "next/link";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Presence } from "@/components/ui/avatar";
import type { MemberDto, TripDto } from "@/features/itinerary/types";
import { TripDatesDialog } from "@/features/trip";

import { coverGradient } from "@/lib/constants/covers";
import { cn } from "@/lib/utils";
import { formatPeriod, nightsDays } from "@/lib/tripDate";
import { useOverlayStore } from "@/store/overlayStore";

import { ViewSegment } from "./ViewSegment";

/**
 * 워크스페이스 상단 바(셸) — 목록·여행 정보·뷰 세그먼트·접속 멤버·공유. 설계 §2 / 시안 플랜 뷰.
 * 권한 강제는 서버/RLS(§8.2) — 여기 canEdit 은 UI 노출 분기일 뿐.
 */
interface WorkspaceTopBarProps {
  trip: TripDto;
  members: MemberDto[];
  canEdit: boolean;
}

export function WorkspaceTopBar({ trip, members, canEdit }: WorkspaceTopBarProps) {
  const isViewer = trip.my_role === "viewer";
  // 날짜 수정은 owner 전용(B3) — RLS(trip_update)가 서버에서 최종 강제(§8.2).
  const isOwner = trip.my_role === "owner";
  const period = formatPeriod(trip.start_date, trip.end_date);
  const { label: nightsLabel } = nightsDays(trip.start_date, trip.end_date);
  const openOverlay = useOverlayStore((s) => s.open);
  const [moreOpen, setMoreOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);

  return (
    <header className="relative hidden h-[66px] flex-none items-center justify-between border-b border-line bg-background px-[18px] md:flex">
      {/* 좌: 목록 + 여행 정보 */}
      <div className="flex min-w-0 items-center gap-3.5">
        <Link
          href="/trips"
          className={buttonVariants({
            variant: "secondary",
            size: "sm",
            className: "gap-1.5 pr-[11px] pl-2",
          })}
        >
          <Icon name="arrow-left" size={17} strokeWidth={2} />
          목록
        </Link>
        <span className="h-6 w-px bg-line" />
        <span
          className="flex size-[42px] flex-none items-center justify-center rounded-lg text-white shadow-[0_4px_10px_-2px_color-mix(in_srgb,var(--color-ink)_28%,transparent)]"
          style={{ background: coverGradient(trip.cover_color) }}
        >
          <Icon name={trip.cover_icon} size={22} strokeWidth={2.1} />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="truncate text-[17px] font-bold tracking-tight text-ink">
              {trip.title}
            </span>
            {isViewer && (
              <span className="inline-flex items-center gap-1 rounded-pill bg-secondary px-2 py-0.5 text-[11px] font-bold text-faint">
                <Icon name="eye" size={12} strokeWidth={2.2} />
                보기 전용
              </span>
            )}
          </div>
          {isOwner ? (
            <button
              type="button"
              onClick={() => setDatesOpen(true)}
              aria-label="여행 날짜 수정"
              className={cn(
                "group -mx-1.5 -my-0.5 flex items-center gap-1.5 rounded-md px-1.5 py-0.5",
                "text-[12.5px] font-medium text-faint transition-colors hover:bg-secondary hover:text-subtle",
              )}
            >
              <Icon name="calendar" size={13} strokeWidth={2} />
              {period}
              <span className="rounded-pill bg-canvas px-1.5 py-px text-[11.5px] font-semibold text-subtle">
                {nightsLabel}
              </span>
              <Icon
                name="pencil"
                size={12}
                strokeWidth={2.2}
                className="text-mute opacity-0 transition-opacity group-hover:opacity-100"
              />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-faint">
              <Icon name="calendar" size={13} strokeWidth={2} />
              {period}
              <span className="rounded-pill bg-canvas px-1.5 py-px text-[11.5px] font-semibold text-subtle">
                {nightsLabel}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 중앙: 뷰 세그먼트 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <ViewSegment />
      </div>

      {/* 우: 접속 멤버 + 공유 / viewer 배지 */}
      <div className="flex items-center gap-3.5">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-semibold text-faint">접속 중</span>
          <Presence
            members={members
              .filter((m) => m.online)
              .map((m) => ({ initial: m.initial, color: m.color, imageUrl: m.avatarUrl }))}
            size={32}
          />
        </div>
        <span className="h-6 w-px bg-line" />
        {canEdit ? (
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              className="gap-1.5"
              onClick={() => openOverlay("share")}
            >
              <Icon name="share" size={16} strokeWidth={2} />
              공유
            </Button>
            <div className="relative">
              <Button
                variant="secondary"
                size="icon-sm"
                aria-label="더보기"
                aria-expanded={moreOpen}
                onClick={() => setMoreOpen((v) => !v)}
                className="px-0"
              >
                <Icon name="more-horizontal" size={18} strokeWidth={2.2} />
              </Button>
              {moreOpen && (
                <>
                  <button
                    type="button"
                    aria-hidden
                    tabIndex={-1}
                    className="fixed inset-0 z-10 cursor-default"
                    onClick={() => setMoreOpen(false)}
                  />
                  <div className="absolute top-[calc(100%+6px)] right-0 z-20 w-[168px] rounded-lg border border-line bg-popover p-1.5 shadow-modal">
                    <Link
                      href={`/trips/${trip.id}/pamphlet`}
                      onClick={() => setMoreOpen(false)}
                      className="flex items-center gap-2 rounded-md px-2.5 py-2 text-[13px] font-semibold text-body hover:bg-secondary"
                    >
                      <Icon name="file-text" size={15} strokeWidth={2} />
                      팜플렛 만들기
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <span className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-3.5 text-[13px] font-semibold text-faint">
            <Icon name="eye" size={15} strokeWidth={2} />
            공유받은 플랜
          </span>
        )}
      </div>

      {isOwner && (
        <TripDatesDialog
          tripId={trip.id}
          startDate={trip.start_date}
          endDate={trip.end_date}
          open={datesOpen}
          onOpenChange={setDatesOpen}
        />
      )}
    </header>
  );
}
