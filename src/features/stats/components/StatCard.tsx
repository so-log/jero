"use client";

import type { ReactNode } from "react";

import { Icon, type IconName } from "@/components/ui/icon";

/**
 * 통계 요약 카드 — 라벨 + 아이콘 타일 + 값 + 보조. 예산 대시보드(07) MetricCard 톤 재사용(@theme 토큰).
 */
type Tone = "primary" | "success" | "violet" | "danger";

const TONE: Record<Tone, { bg: string; fg: string }> = {
  primary: { bg: "var(--color-primary-tint)", fg: "var(--color-primary-hover)" },
  success: { bg: "var(--color-success-tint)", fg: "var(--color-success)" },
  violet: { bg: "var(--color-violet-tint)", fg: "var(--color-violet)" },
  danger: { bg: "var(--color-danger-tint)", fg: "var(--color-danger)" },
};

export function StatCard({
  label,
  value,
  icon,
  tone,
  sub,
}: {
  label: string;
  value: string;
  icon: IconName;
  tone: Tone;
  sub?: ReactNode;
}) {
  const t = TONE[tone];
  return (
    <div className="flex flex-col gap-3 rounded-panel border border-line bg-background p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] font-semibold text-faint">{label}</span>
        <span
          className="flex size-[34px] flex-none items-center justify-center rounded-md"
          style={{ background: t.bg, color: t.fg }}
        >
          <Icon name={icon} size={18} strokeWidth={2} />
        </span>
      </div>
      <div className="text-[23px] font-extrabold tracking-tight text-ink">
        {value}
      </div>
      {sub ?? <span className="text-[11.5px] font-semibold text-faint">&nbsp;</span>}
    </div>
  );
}
