"use client";

import { Controller, useFormContext } from "react-hook-form";

import { Icon, type IconName } from "@/components/ui/icon";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { cn } from "@/lib/utils";

import type { ProfileForm } from "../lib/profileSchema";
import type { NotifKey } from "../types";

/** 기본 설정 섹션 — 기본 통화 + 알림 토글 4종. 시안 preference. */
const CURRENCY_ITEMS = [
  { value: "KRW", label: "₩ 원" },
  { value: "JPY", label: "¥ 엔" },
  { value: "USD", label: "$ 달러" },
  { value: "EUR", label: "€ 유로" },
];

const NOTIF_ROWS: {
  key: NotifKey;
  icon: IconName;
  tone: string;
  title: string;
  desc: string;
}[] = [
  { key: "trip", icon: "bell", tone: "primary", title: "여행 업데이트", desc: "멤버가 일정을 바꾸면 알려드려요" },
  { key: "comment", icon: "message", tone: "violet", title: "댓글 · 멘션", desc: "나를 언급하거나 댓글을 남기면" },
  { key: "settle", icon: "wallet", tone: "warn", title: "정산 알림", desc: "정산이 추가되거나 변경될 때" },
  { key: "marketing", icon: "mail", tone: "neutral", title: "소식 · 마케팅", desc: "새 기능과 여행 팁을 받아볼게요" },
];

const TONE: Record<string, { bg: string; fg: string }> = {
  primary: { bg: "var(--color-primary-tint)", fg: "var(--color-primary-hover)" },
  success: { bg: "var(--color-success-tint)", fg: "var(--color-success)" },
  violet: { bg: "var(--color-violet-tint)", fg: "var(--color-violet)" },
  warn: { bg: "var(--color-warn-tint)", fg: "var(--color-warn)" },
  neutral: { bg: "var(--secondary)", fg: "var(--color-subtle)" },
};

export function PreferenceSection() {
  const { control } = useFormContext<ProfileForm>();

  return (
    <section id="section-pref" className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-base font-extrabold tracking-tight text-ink">기본 설정</h2>
        <span className="text-[13px] font-medium text-faint">
          통화와 알림을 원하는 대로 맞춰보세요.
        </span>
      </div>

      <div className="overflow-hidden rounded-panel border border-line bg-background">
        {/* 기본 통화 (좁은 폭에서 세로 스택) */}
        <div className="flex flex-col items-start gap-3 border-b border-line p-[18px] sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <Row icon="wallet" tone="success" title="기본 통화" desc="예산·지출에 기본으로 쓰여요" />
          <Controller
            control={control}
            name="currency"
            render={({ field }) => (
              <SegmentedTabs
                items={CURRENCY_ITEMS}
                value={field.value}
                onValueChange={field.onChange}
                size="sm"
                aria-label="기본 통화"
              />
            )}
          />
        </div>

        {/* 알림 토글 */}
        {NOTIF_ROWS.map((row, i) => (
          <div
            key={row.key}
            className={cn(
              "flex items-center justify-between gap-4 p-[18px]",
              i < NOTIF_ROWS.length - 1 && "border-b border-line",
            )}
          >
            <Row icon={row.icon} tone={row.tone} title={row.title} desc={row.desc} />
            <Controller
              control={control}
              name={`notif.${row.key}`}
              render={({ field }) => (
                <Switch checked={field.value} onChange={field.onChange} />
              )}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function Row({
  icon,
  tone,
  title,
  desc,
}: {
  icon: IconName;
  tone: string;
  title: string;
  desc: string;
}) {
  const t = TONE[tone] ?? TONE.neutral;
  return (
    <div className="flex items-center gap-3">
      <span
        className="flex size-[38px] flex-none items-center justify-center rounded-md"
        style={{ background: t.bg, color: t.fg }}
      >
        <Icon name={icon} size={18} strokeWidth={2} />
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-bold text-body">{title}</span>
        <span className="text-[12.5px] font-medium text-faint">{desc}</span>
      </div>
    </div>
  );
}

function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-[26px] w-[44px] flex-none rounded-pill transition-colors",
        checked ? "bg-primary" : "bg-line-strong",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-[22px] rounded-full bg-white shadow-card transition-all",
          checked ? "left-[20px]" : "left-0.5",
        )}
      />
    </button>
  );
}
