"use client";

import Link from "next/link";

import { Icon } from "@/components/ui/icon";

/**
 * 공개 상단 바(08) — 워크스페이스 바와 다름. 브랜드 + "읽기 전용" 배지 + 로그인 CTA. 시안 top bar.
 * 변경/목록/세그먼트/공유 버튼 없음(읽기 전용 공개 뷰).
 */
export function SharePublicBar() {
  return (
    <header className="flex h-16 flex-none items-center justify-between border-b border-line bg-background px-[22px]">
      <div className="flex items-center gap-2.5">
        <span className="flex size-[34px] items-center justify-center rounded-md bg-gradient-to-br from-[#6E9CF2] to-[#8FBCF7] text-white shadow-[0_4px_10px_-2px_color-mix(in_srgb,#5B8DEF_50%,transparent)]">
          <Icon name="map-pin" size={19} strokeWidth={2.4} />
        </span>
        <span className="text-[18px] font-extrabold tracking-tight text-ink">
          jero
        </span>
        <span className="ml-1 inline-flex items-center gap-1 rounded-pill bg-secondary px-2.5 py-1 text-[11.5px] font-bold text-faint">
          <Icon name="eye" size={12} strokeWidth={2.2} />
          읽기 전용
        </span>
      </div>
      <div className="flex items-center gap-2.5">
        <Link
          href="/"
          className="flex h-9 items-center rounded-md px-3.5 text-[13.5px] font-semibold text-subtle hover:bg-secondary"
        >
          로그인
        </Link>
        <Link
          href="/"
          className="inline-flex h-[38px] items-center gap-1.5 rounded-md bg-primary px-4 text-[13.5px] font-bold text-primary-foreground shadow-primary hover:bg-primary-hover"
        >
          무료로 시작하기
          <Icon name="arrow-right" size={15} strokeWidth={2.3} />
        </Link>
      </div>
    </header>
  );
}
