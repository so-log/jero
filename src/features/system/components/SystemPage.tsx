"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

import {
  SYSTEM_STATES,
  TONE,
  type SystemAction,
  type SystemVariant,
} from "../lib/states";

/**
 * 11 시스템 페이지 — 404/에러/403/점검 공통 레이아웃. 상태 설정만 주입(중복 구현 금지, 설계 §9).
 * Next 특수 파일(not-found/error/global-error)이 이를 렌더. 08 만료 링크도 이 컴포넌트로 통일.
 * 오버라이드(title/description/code/helper/actions)로 화면별 문구를 바꿀 수 있다(일반화 메시지, §8.5).
 */
interface SystemPageProps {
  variant: SystemVariant;
  title?: string;
  description?: string;
  code?: string;
  /** 헬퍼 텍스트(예: 추적 ID·예상 완료 시각). 민감정보 비노출. */
  helper?: string;
  actions?: SystemAction[];
  /** 에러 boundary reset (behavior:'retry' 액션에 연결). */
  onRetry?: () => void;
}

export function SystemPage({
  variant,
  title,
  description,
  code,
  helper,
  actions,
  onRetry,
}: SystemPageProps) {
  const router = useRouter();
  const state = SYSTEM_STATES[variant];
  const tone = TONE[state.tone];
  const resolvedActions = actions ?? state.actions;
  const resolvedHelper = helper ?? state.helper;

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      {/* 최소 상단 바 — 로고만 */}
      <div className="absolute top-0 right-0 left-0 z-10 flex h-[66px] items-center px-[26px]">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-[34px] items-center justify-center rounded-md bg-gradient-to-br from-[#6E9CF2] to-[#8FBCF7] text-white shadow-[0_4px_10px_-2px_color-mix(in_srgb,#5B8DEF_50%,transparent)]">
            <Icon name="map-pin" size={19} strokeWidth={2.4} />
          </span>
          <span className="text-[18px] font-extrabold tracking-tight text-ink">jero</span>
        </Link>
      </div>

      {/* 앰비언트 글로우 */}
      <div
        className="pointer-events-none absolute -top-[120px] -right-[120px] size-[420px] rounded-full"
        style={{
          background: `radial-gradient(circle, color-mix(in srgb, ${tone.accent} 16%, transparent), transparent 68%)`,
        }}
      />

      {/* 중앙 블록 */}
      <div className="relative z-[1] flex flex-1 flex-col items-center justify-center p-10 text-center">
        <Illustration tint={tone.tint} accent={tone.accent} big={state.big} badge={state.badge} />

        <div
          className="mt-[30px] inline-flex h-7 items-center gap-1.5 rounded-pill px-3 text-[12.5px] font-extrabold tracking-wide"
          style={{ background: tone.tint, color: tone.accent }}
        >
          {code ?? state.code}
        </div>

        <h1 className="mt-4 text-[28px] font-extrabold tracking-tight text-ink">
          {title ?? state.title}
        </h1>
        <p className="mt-3 max-w-[420px] text-[15px] font-medium leading-relaxed text-faint">
          {description ?? state.description}
        </p>

        <div className="mt-[30px] flex items-center gap-3">
          {resolvedActions.map((a) => (
            <ActionButton key={a.label} action={a} accent={tone.accent} onBack={() => router.back()} onRetry={onRetry} />
          ))}
        </div>

        {resolvedHelper && (
          <div className="mt-[22px] inline-flex items-center gap-1.5 text-xs font-semibold text-mute">
            <Icon name="clock" size={13} strokeWidth={2} />
            {resolvedHelper}
          </div>
        )}
      </div>
    </main>
  );
}

function Illustration({
  tint,
  accent,
  big,
  badge,
}: {
  tint: string;
  accent: string;
  big: IconName;
  badge: IconName;
}): ReactNode {
  const d = 188;
  return (
    <div className="relative flex items-center justify-center" style={{ width: d, height: d }}>
      <div className="absolute inset-0 rounded-full" style={{ background: tint }} />
      <div
        className="absolute rounded-full bg-white shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-ink)_4%,transparent)]"
        style={{ inset: d * 0.12 }}
      />
      <span className="relative" style={{ color: accent }}>
        <Icon name={big} size={Math.round(d * 0.34)} strokeWidth={1.8} />
      </span>
      <span
        className="absolute flex items-center justify-center rounded-full bg-white shadow-[0_4px_12px_-2px_color-mix(in_srgb,var(--color-ink)_18%,transparent)]"
        style={{
          right: d * 0.18,
          bottom: d * 0.2,
          width: d * 0.21,
          height: d * 0.21,
          color: accent,
        }}
      >
        <Icon name={badge} size={Math.round(d * 0.115)} strokeWidth={2.2} />
      </span>
    </div>
  );
}

function ActionButton({
  action,
  accent,
  onBack,
  onRetry,
}: {
  action: SystemAction;
  accent: string;
  onBack: () => void;
  onRetry?: () => void;
}) {
  const primary = action.kind === "primary";
  const className = cn(
    "inline-flex h-11 items-center gap-2 rounded-md px-5 text-sm font-bold transition-colors",
    primary
      ? "text-white"
      : "border border-line-strong bg-background text-body hover:bg-secondary",
  );
  const style = primary
    ? { background: accent, boxShadow: `0 5px 14px -3px color-mix(in srgb, ${accent} 53%, transparent)` }
    : undefined;
  const content = (
    <>
      <Icon name={action.icon} size={17} strokeWidth={2.2} />
      {action.label}
    </>
  );

  if (action.to) {
    return (
      <Link href={action.to} className={className} style={style}>
        {content}
      </Link>
    );
  }
  // behavior 동작: back/retry 는 즉시, invite/status 는 후속(§13) 스텁.
  const onClick = () => {
    if (action.behavior === "back") onBack();
    else if (action.behavior === "retry") onRetry?.();
    // invite/status: TODO(§13) — 초대 요청 메커니즘 / 상태 페이지 목적지.
  };
  return (
    <button type="button" onClick={onClick} className={className} style={style}>
      {content}
    </button>
  );
}
