"use client";

import Link from "next/link";

import { Presence } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { RoleBadge } from "@/components/ui/role-badge";
import { COVER } from "@/lib/constants/covers";
import { ddayLabel, formatPeriod, nightsDays } from "@/lib/tripDate";

import type { TripSummaryDto } from "../types";

/**
 * 여행 카드 — 커버(그라데이션·지도 그리드·아이콘 메달리언·역할 배지·D-day) + 제목·기간·멤버·장소 수. 시안 trip card.
 * 카드 클릭 → 워크스페이스 플랜 뷰. Link prefetch + ['trip', id] seed 로 진입이 즉시(캐시 연속성).
 */
export function TripCard({
  trip,
  todayISO,
}: {
  trip: TripSummaryDto;
  todayISO: string;
}) {
  const period = formatPeriod(trip.start_date, trip.end_date);
  const { label: nights } = nightsDays(trip.start_date, trip.end_date);
  const dday = ddayLabel(trip.start_date, todayISO);

  return (
    <Link
      href={`/trips/${trip.id}?view=plan`}
      className="group flex flex-col overflow-hidden rounded-panel border border-line bg-background transition-all hover:-translate-y-[3px] hover:border-line-strong hover:shadow-lift"
    >
      {/* 커버 */}
      <div
        className="relative h-32 overflow-hidden"
        style={{ background: COVER[trip.cover_color].gradient }}
      >
        <svg
          className="absolute inset-0 opacity-20"
          width="100%"
          height="100%"
          viewBox="0 0 400 128"
          preserveAspectRatio="none"
          aria-hidden
        >
          <g stroke="#fff" strokeWidth={1.4} fill="none">
            <path d="M-20 90 C 80 70 160 110 260 86 C 320 72 360 96 420 84" />
            <path d="M120 -10 V138" />
            <path d="M300 -10 V138" />
            <path d="M-10 40 H420" />
          </g>
        </svg>
        <span className="absolute bottom-3.5 left-4 flex size-[46px] items-center justify-center rounded-lg bg-white/90 text-subtle shadow-[0_4px_12px_-2px_color-mix(in_srgb,var(--color-ink)_20%,transparent)] backdrop-blur">
          <Icon name={trip.cover_icon} size={24} strokeWidth={2} />
        </span>
        <div className="absolute top-3 right-3">
          <RoleBadge role={trip.my_role} frosted />
        </div>
        {dday && (
          <span className="absolute top-3 left-3 flex h-6 items-center rounded-pill bg-ink/55 px-2.5 text-[11.5px] font-bold text-white backdrop-blur">
            {dday}
          </span>
        )}
      </div>

      {/* 본문 */}
      <div className="flex flex-col gap-3 px-4 pt-3.5 pb-4">
        <div className="flex flex-col gap-1.5">
          <span className="truncate text-base font-bold tracking-tight text-ink">
            {trip.title}
          </span>
          <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-faint">
            <Icon name="calendar" size={13} strokeWidth={2} />
            {period}
            <span className="size-[3px] rounded-full bg-mute" />
            {nights}
          </div>
        </div>
        <div className="h-px bg-line" />
        <div className="flex items-center justify-between">
          <Presence members={trip.member_avatars} size={26} />
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-faint">
            <Icon name="bookmark" size={13} strokeWidth={2} />
            {trip.place_count}곳
          </span>
        </div>
      </div>
    </Link>
  );
}
