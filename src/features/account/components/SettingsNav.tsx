"use client";

import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

import { ACCOUNT_META } from "../api/useAccount";

/** 좌측 섹션 내비게이션(230px) — 현재 섹션 강조 + 버전/마지막 로그인. 시안 nav. */
export type SettingsSection = "profile" | "pref" | "account";

const NAV: { key: SettingsSection; label: string; icon: IconName }[] = [
  { key: "profile", label: "프로필", icon: "user" },
  { key: "pref", label: "기본 설정", icon: "sliders" },
  { key: "account", label: "계정 관리", icon: "shield" },
];

export function SettingsNav({
  active,
  onSelect,
}: {
  active: SettingsSection;
  onSelect: (section: SettingsSection) => void;
}) {
  return (
    <nav className="flex w-[230px] flex-none flex-col gap-0.5 border-r border-line bg-surface p-[18px_14px]">
      {NAV.map((n) => {
        const on = n.key === active;
        return (
          <button
            key={n.key}
            type="button"
            aria-current={on}
            onClick={() => onSelect(n.key)}
            className={cn(
              "flex h-11 items-center gap-3 rounded-md px-3.5 text-left transition-colors",
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
      <div className="mt-auto px-2.5 py-3 text-[11.5px] font-medium leading-relaxed text-mute">
        jero {ACCOUNT_META.version} · 마지막 로그인
        <br />
        {ACCOUNT_META.lastLogin}
      </div>
    </nav>
  );
}
