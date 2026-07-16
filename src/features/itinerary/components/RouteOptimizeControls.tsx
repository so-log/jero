"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

/**
 * 동선 최적화 컨트롤(2차, 설계 §6) — 플랜 Day 툴바에 놓이는 버튼/미리보기 배너.
 * editor+ 만(viewer 는 canEdit=false 로 미노출). 계산·저장은 useRouteOptimize 훅이 담당(표현만).
 */
interface RouteOptimizeControlsProps {
  canEdit: boolean;
  /** 그 날 좌표 있는 장소 수 — 2 미만이면 최적화 버튼 숨김. */
  coordCount: number;
  previewing: boolean;
  beforeKm: number;
  afterKm: number;
  excludedCount: number;
  isApplying: boolean;
  canUndo: boolean;
  onOptimize: () => void;
  onApply: () => void;
  onCancel: () => void;
  onUndo: () => void;
}

export function RouteOptimizeControls({
  canEdit,
  coordCount,
  previewing,
  beforeKm,
  afterKm,
  excludedCount,
  isApplying,
  canUndo,
  onOptimize,
  onApply,
  onCancel,
  onUndo,
}: RouteOptimizeControlsProps) {
  if (!canEdit) return null; // viewer 미노출

  if (previewing) {
    const saved = Math.round((beforeKm - afterKm) * 10) / 10;
    return (
      <div className="flex flex-col gap-2.5 rounded-lg border border-primary/30 bg-primary-wash p-3">
        <div className="flex items-center gap-2">
          <Icon name="route" size={16} strokeWidth={2} className="flex-none text-primary-hover" />
          <span className="text-[13px] font-bold text-ink">
            총 이동 {beforeKm}km
            <Icon
              name="arrow-right"
              size={13}
              strokeWidth={2.4}
              className="mx-1 inline align-[-1px] text-mute"
            />
            <span className="text-primary-hover">{afterKm}km</span>
          </span>
          {saved > 0 && (
            <span className="rounded-pill bg-success-tint px-1.5 py-0.5 text-[11px] font-bold text-success">
              −{saved}km
            </span>
          )}
        </div>
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
    <div className="flex items-center gap-2">
      {coordCount >= 2 && (
        <Button
          variant="soft"
          size="sm"
          className="h-9 flex-1 gap-1.5"
          onClick={onOptimize}
        >
          <Icon name="route" size={16} strokeWidth={2} />
          동선 최적화
        </Button>
      )}
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
  );
}
