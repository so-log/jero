"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { cn } from "@/lib/utils";

import type { OptimizeMode } from "../hooks/useRouteOptimize";

/**
 * 동선 최적화 컨트롤(2·3차, 설계 §6) — 플랜 Day 툴바 옵션/버튼 + 미리보기 배너.
 * editor+ 만(viewer 는 canEdit=false 로 미노출). 계산·저장은 useRouteOptimize 훅(표현만).
 * 3차: 기준(직선거리|실이동시간) 세그먼트 + 앵커(출발/복귀 고정) 칩. 실이동 폴백 시 단위 자동 km.
 */
interface RouteOptimizeControlsProps {
  canEdit: boolean;
  /** 그 날 좌표 있는 장소 수 — 2 미만이면 최적화 버튼 숨김. */
  coordCount: number;
  previewing: boolean;
  before: number;
  after: number;
  unit: "km" | "min";
  excludedCount: number;
  fellBack: boolean;
  isApplying: boolean;
  isPreviewing: boolean;
  mode: OptimizeMode;
  onModeChange: (mode: OptimizeMode) => void;
  anchorStart: boolean;
  anchorEnd: boolean;
  onToggleStart: () => void;
  onToggleEnd: () => void;
  canUndo: boolean;
  onOptimize: () => void;
  onApply: () => void;
  onCancel: () => void;
  onUndo: () => void;
}

const MODE_ITEMS = [
  { value: "distance", label: "직선거리" },
  { value: "time", label: "실이동시간" },
];

const fmt = (n: number, unit: "km" | "min"): string =>
  unit === "min" ? `${n}분` : `${n}km`;

function AnchorChip({
  on,
  label,
  onToggle,
}: {
  on: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-pill border px-2.5 text-[12px] font-semibold transition-colors",
        on
          ? "border-primary bg-primary-tint text-primary-hover"
          : "border-line-strong bg-background text-subtle hover:bg-secondary",
      )}
    >
      <Icon name={on ? "check" : "map-pin"} size={13} strokeWidth={2.2} />
      {label}
    </button>
  );
}

export function RouteOptimizeControls({
  canEdit,
  coordCount,
  previewing,
  before,
  after,
  unit,
  excludedCount,
  fellBack,
  isApplying,
  isPreviewing,
  mode,
  onModeChange,
  anchorStart,
  anchorEnd,
  onToggleStart,
  onToggleEnd,
  canUndo,
  onOptimize,
  onApply,
  onCancel,
  onUndo,
}: RouteOptimizeControlsProps) {
  if (!canEdit) return null; // viewer 미노출

  if (previewing) {
    const saved = Math.round((before - after) * 10) / 10;
    return (
      <div className="flex flex-col gap-2.5 rounded-lg border border-primary/30 bg-primary-wash p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Icon name="route" size={16} strokeWidth={2} className="flex-none text-primary-hover" />
          <span className="text-[13px] font-bold text-ink">
            총 이동 {fmt(before, unit)}
            <Icon
              name="arrow-right"
              size={13}
              strokeWidth={2.4}
              className="mx-1 inline align-[-1px] text-mute"
            />
            <span className="text-primary-hover">{fmt(after, unit)}</span>
          </span>
          {saved > 0 && (
            <span className="rounded-pill bg-success-tint px-1.5 py-0.5 text-[11px] font-bold text-success">
              −{fmt(saved, unit)}
            </span>
          )}
        </div>
        {fellBack && (
          <span className="text-[11.5px] font-medium text-warn">
            실이동시간을 불러오지 못해 직선거리로 계산했어요
          </span>
        )}
        {excludedCount > 0 && (
          <span className="text-[11.5px] font-medium text-faint">
            좌표 없는 장소 {excludedCount}곳은 순서를 유지해요
          </span>
        )}
        <div className="flex gap-2">
          <Button
            variant="soft"
            size="sm"
            className="h-9 flex-1 gap-1"
            onClick={onCancel}
            disabled={isApplying}
          >
            <Icon name="x" size={15} strokeWidth={2.4} />
            취소
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="h-9 flex-1 gap-1"
            onClick={onApply}
            disabled={isApplying}
          >
            <Icon name="check" size={15} strokeWidth={2.6} />
            적용
          </Button>
        </div>
      </div>
    );
  }

  // 최적화할 좌표가 2곳 미만이고 되돌릴 것도 없으면 노출 안 함.
  if (coordCount < 2 && !canUndo) return null;

  return (
    <div className="flex flex-col gap-2">
      {coordCount >= 2 && (
        <>
          {/* 기준 + 앵커 옵션 */}
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedTabs
              items={MODE_ITEMS}
              value={mode}
              onValueChange={(v) => onModeChange(v as OptimizeMode)}
              size="sm"
              aria-label="최적화 기준"
            />
            <AnchorChip on={anchorStart} label="출발 고정" onToggle={onToggleStart} />
            <AnchorChip on={anchorEnd} label="복귀 고정" onToggle={onToggleEnd} />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="soft"
              size="sm"
              className="h-9 flex-1 gap-1.5"
              onClick={onOptimize}
              disabled={isPreviewing}
            >
              <Icon name="route" size={16} strokeWidth={2} />
              {isPreviewing ? "계산 중…" : "동선 최적화"}
            </Button>
            {canUndo && (
              <Button
                variant="secondary"
                size="sm"
                className="h-9 gap-1.5"
                onClick={onUndo}
                disabled={isApplying}
              >
                <Icon name="refresh" size={15} strokeWidth={2.2} />
                되돌리기
              </Button>
            )}
          </div>
        </>
      )}
      {coordCount < 2 && canUndo && (
        <div className="flex items-center">
          <Button
            variant="secondary"
            size="sm"
            className="h-9 gap-1.5"
            onClick={onUndo}
            disabled={isApplying}
          >
            <Icon name="refresh" size={15} strokeWidth={2.2} />
            되돌리기
          </Button>
        </div>
      )}
    </div>
  );
}
