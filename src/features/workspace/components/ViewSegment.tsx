"use client";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

import { useWorkspaceView, WORKSPACE_VIEWS } from "../hooks/useWorkspaceView";

/**
 * 워크스페이스 뷰 세그먼트(플랜/일정표/장소/예산/통계) — 설계 §2 · 2차 E. 시안 플랜 뷰 중앙 토글.
 * 데스크톱(md+) 인라인 탭. 뷰 목록·라우팅은 useWorkspaceView 단일 출처(모바일 드로어와 공유).
 */
export function ViewSegment() {
  const { current, go } = useWorkspaceView();

  return (
    <div
      role="tablist"
      aria-label="뷰 전환"
      className="flex items-center gap-0.5 rounded-md bg-secondary p-1"
    >
      {WORKSPACE_VIEWS.map((v) => {
        const active = v.value === current;
        return (
          <button
            key={v.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => go(v.value)}
            className={cn(
              "inline-flex h-[34px] items-center gap-1.5 rounded-xs px-3.5 text-[13.5px] transition-colors",
              active
                ? "bg-background font-bold text-primary-strong shadow-card"
                : "font-semibold text-faint hover:bg-white/60 hover:text-subtle",
            )}
          >
            <Icon name={v.icon} size={16} strokeWidth={2} />
            {v.label}
          </button>
        );
      })}
    </div>
  );
}
