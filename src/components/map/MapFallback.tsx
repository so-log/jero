"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { MapLegend } from "./MapLegend";

/**
 * 지도 자리표시 — 키 미설정 / 로드 실패 / 로딩 시 깨지지 않게 채운다.
 * 시안의 지도 면(연한 캔버스 + 안내 카드)을 토큰으로 재현. 범례는 유지해 레이아웃 보존.
 */
type FallbackVariant = "no-key" | "error" | "loading";

const MESSAGE: Record<FallbackVariant, string> = {
  "no-key": "지도 키가 설정되지 않았어요",
  error: "지도를 불러오지 못했어요",
  loading: "지도를 불러오는 중…",
};

const SUBTEXT: Record<FallbackVariant, ReactNode> = {
  "no-key": (
    <>
      <code className="rounded bg-secondary px-1.5 py-0.5 text-[12px] font-semibold text-body">
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      </code>
      <span> 를 .env.local 에 설정하면 동선이 표시돼요</span>
    </>
  ),
  error: "잠시 후 다시 시도해 주세요",
  loading: null,
};

export function MapFallback({
  variant,
  legend,
  className,
}: {
  variant: FallbackVariant;
  /** undefined=기본 범례, null=숨김, ReactNode=커스텀. */
  legend?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center bg-canvas",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        {variant === "loading" ? (
          <span className="h-[34px] w-[34px] animate-spin rounded-full border-[3px] border-line-strong border-t-primary" />
        ) : (
          <div className="max-w-[300px] rounded-2xl border border-dashed border-mute bg-white/85 px-6 py-4 text-[13px] font-semibold leading-relaxed text-subtle backdrop-blur">
            <div className="text-body">{MESSAGE[variant]}</div>
            {SUBTEXT[variant] && (
              <div className="mt-1.5 text-faint">{SUBTEXT[variant]}</div>
            )}
          </div>
        )}
        {variant === "loading" && (
          <div className="text-[13px] font-semibold text-subtle">
            {MESSAGE.loading}
          </div>
        )}
      </div>
      {variant !== "loading" &&
        (legend === undefined ? <MapLegend /> : legend)}
    </div>
  );
}
