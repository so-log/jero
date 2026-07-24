"use client";

import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/** 좌측 섹션 내비게이션(230px) — 현재 섹션 강조 + 마지막 로그인(실값). 시안 nav. */
export type SettingsSection = "profile" | "pref" | "account";

const NAV: { key: SettingsSection; label: string; icon: IconName }[] = [
  { key: "profile", label: "프로필", icon: "user" },
  { key: "pref", label: "기본 설정", icon: "sliders" },
  { key: "account", label: "계정 관리", icon: "shield" },
];

export function SettingsNav({
  active,
  onSelect,
  lastLogin,
}: {
  active: SettingsSection;
  onSelect: (section: SettingsSection) => void;
  /** 포맷된 마지막 로그인(실값). 없으면 하단 표기 숨김. */
  lastLogin?: string | null;
}) {
  return (
    // 모바일: 상단 가로 탭(3분할) / 데스크톱: 좌측 세로 사이드바(230px)
    <nav className="flex flex-none gap-0.5 border-b border-line bg-surface p-2 md:w-[230px] md:flex-col md:border-r md:border-b-0 md:p-[18px_14px]">
      {NAV.map((n) => {
        const on = n.key === active;
        return (
          <button
            key={n.key}
            type="button"
            aria-current={on}
            onClick={() => onSelect(n.key)}
            className={cn(
              "flex h-11 flex-1 items-center justify-center gap-2 rounded-md px-2 text-left transition-colors md:flex-none md:justify-start md:gap-3 md:px-3.5",
              on ? "bg-primary-tint" : "hover:bg-secondary",
            )}
          >
            <Icon
              name={n.icon}
              size={18}
              strokeWidth={2}
              color={on ? "var(--color-primary-hover)" : "var(--color-faint)"}
            />
            <span
              className={cn(
                "text-[13.5px]",
                on ? "font-bold text-ink" : "font-semibold text-subtle",
              )}
            >
              {n.label}
            </span>
          </button>
        );
      })}
      {lastLogin && (
        <div className="mt-auto hidden px-2.5 py-3 text-[11.5px] font-medium leading-relaxed text-mute md:block">
          마지막 로그인
          <br />
          {lastLogin}
        </div>
      )}
    </nav>
  );
}
