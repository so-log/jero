"use client";

import Link from "next/link";

import { Icon } from "@/components/ui/icon";

/**
 * 전역 헤더(로그인 후 공통) — 로고 + 검색 + 알림 + 사용자 메뉴. 시안 global header.
 * 표현 전용: 검색은 제어 props(목록 페이지가 클라 필터). **사용자는 props 로 주입**(상위가 useProfileQuery 경유, §7.1).
 * user 미지정(로딩)이면 중립 스켈레톤. 알림은 MVP 비활성(02 §12). 워크스페이스는 WorkspaceTopBar 사용(설계 §2 F2).
 */
interface AppHeaderProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  /** 실제 프로필(없으면 로딩 중립 표시). */
  user?: { initial: string; name: string; color: string };
}

export function AppHeader({ search, onSearchChange, user }: AppHeaderProps) {
  return (
    <header className="flex h-16 flex-none items-center justify-between border-b border-line bg-background px-4 sm:px-[22px]">
      <Link href="/trips" className="flex flex-none items-center gap-2.5">
        <span className="flex size-[34px] items-center justify-center rounded-md bg-gradient-to-br from-[#6E9CF2] to-[#8FBCF7] text-white shadow-[0_4px_10px_-2px_color-mix(in_srgb,#5B8DEF_50%,transparent)]">
          <Icon name="map-pin" size={20} strokeWidth={2.4} />
        </span>
        <span className="text-[18px] font-extrabold tracking-tight text-ink">
          jero
        </span>
      </Link>

      <div className="flex min-w-0 flex-1 justify-center px-2 sm:px-7">
        <div className="flex h-10 w-full max-w-[420px] items-center gap-2 rounded-md border border-transparent bg-secondary px-3.5 text-faint focus-within:border-primary/40 focus-within:bg-background">
          <Icon name="search" size={17} strokeWidth={2.2} />
          <input
            value={search ?? ""}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="여행 또는 장소 검색"
            className="min-w-0 flex-1 bg-transparent text-[13.5px] font-medium text-body outline-none placeholder:text-faint"
          />
        </div>
      </div>

      <div className="flex flex-none items-center gap-2">
        <button
          type="button"
          aria-label="알림 (준비 중)"
          disabled
          className="flex size-[38px] items-center justify-center rounded-md border border-line-strong bg-background text-faint disabled:opacity-60"
        >
          <Icon name="bell" size={18} strokeWidth={2} />
        </button>
        {user ? (
          <Link
            href="/settings"
            className="flex h-[38px] items-center gap-2 rounded-pill border border-line-strong bg-background py-[3px] pr-[3px] pl-[3px] hover:bg-secondary sm:pr-2.5"
          >
            <span
              className="flex size-[30px] items-center justify-center rounded-full border-2 bg-background text-[12.5px] font-bold"
              style={{ borderColor: user.color, color: user.color }}
            >
              {user.initial}
            </span>
            <span className="hidden text-[13px] font-semibold text-body sm:inline">
              {user.name}
            </span>
            <Icon
              name="chevron-down"
              size={15}
              strokeWidth={2.2}
              className="hidden text-mute sm:block"
            />
          </Link>
        ) : (
          // 로딩 중립 — 하드코딩 이름 노출 방지.
          <div
            aria-hidden
            className="flex h-[38px] items-center gap-2 rounded-pill border border-line-strong bg-background py-[3px] pr-3 pl-[3px]"
          >
            <span className="size-[30px] animate-pulse rounded-full bg-secondary" />
            <span className="h-3 w-14 animate-pulse rounded bg-secondary" />
          </div>
        )}
      </div>
    </header>
  );
}
