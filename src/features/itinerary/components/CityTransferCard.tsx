"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import {
  useUpsertCityTransfer,
  type CitySegment,
  type TransferMode,
} from "@/features/trip";
import { cityColor } from "@/lib/constants/cityColors";
import { cn } from "@/lib/utils";

import { transferForDate } from "../lib/citySelectors";
import { TRANSFER_MODES, formatTransferTime, transferMode } from "../lib/transfer";

/**
 * 도시 간 이동 카드(다중 도시 Phase 5, 시안 §4) — 도시가 바뀌는 경계일(도착 도시 첫날)에 자동 배치.
 * from·to 색 점 + 모드 아이콘 + "도쿄 › 오사카" + 상세(이름·시각·약 N분) + 모드 라벨 pill.
 * 이동 정보 없으면 editor+ 에게 "이동 추가" 프롬프트. 편집은 useUpsertCityTransfer(낙관). 컴포넌트 직접 fetch 없음(§7.1).
 * date 가 경계일이 아니거나 단일 도시면 렌더하지 않는다(회귀 0).
 */
interface CityTransferCardProps {
  tripId: string;
  /** 도시 파생 구간(seq 순). 2개 이상일 때만 경계가 생긴다. */
  schedule: CitySegment[];
  /** 현재 보고 있는 날짜('YYYY-MM-DD'). */
  date: string | undefined;
  canEdit: boolean;
  /** 호스트가 간격을 제어(경계일이 아니면 아무것도 렌더 안 하므로 빈 여백 없음). */
  className?: string;
}

export function CityTransferCard({
  tripId,
  schedule,
  date,
  canEdit,
  className,
}: CityTransferCardProps) {
  const transfer = transferForDate(schedule, date);
  const [editing, setEditing] = useState(false);

  if (!transfer) return null;
  const { from, to } = transfer;
  const arrival = to.arrival ?? null;
  const fromColor = cityColor(from.seq);
  const toColor = cityColor(to.seq);
  const hasArrival = !!(
    arrival &&
    (arrival.mode || arrival.name || arrival.time || arrival.durationMin != null)
  );

  // 이동 정보 없음 — editor 는 추가 프롬프트, viewer 는 렌더 안 함(잡음 최소).
  if (!hasArrival) {
    if (!canEdit) return null;
    return (
      <>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-panel border-[1.5px] border-dashed border-line-strong bg-surface px-3.5 py-2.5 text-left transition-colors hover:border-primary hover:bg-primary-wash",
            className,
          )}
        >
          <span className="flex size-8 flex-none items-center justify-center rounded-full bg-secondary text-faint">
            <Icon name="plus" size={16} strokeWidth={2.3} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="flex items-center gap-1.5 text-[13px] font-bold text-body">
              {from.name}
              <Icon name="chevron-right" size={13} strokeWidth={2.4} className="text-faint" />
              {to.name}
            </span>
            <span className="text-[11.5px] font-semibold text-faint">
              이동 수단·시간 추가
            </span>
          </span>
        </button>
        <TransferEditor
          open={editing}
          onClose={() => setEditing(false)}
          tripId={tripId}
          transfer={transfer}
        />
      </>
    );
  }

  const meta = transferMode(arrival.mode);
  const detail = [arrival.name, formatTransferTime(arrival.time)]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-3 rounded-panel border-[1.5px] border-dashed border-line-strong bg-background px-3.5 py-3",
          className,
        )}
      >
        {/* from → to 도시 색 점 + 그라데이션 라인 */}
        <div className="relative flex flex-none flex-col items-center">
          <span className="size-2.5 rounded-full" style={{ background: fromColor.color }} />
          <span
            className="my-0.5 h-4 w-0.5"
            style={{ background: `linear-gradient(to bottom, ${fromColor.color}, ${toColor.color})` }}
          />
          <span className="size-2.5 rounded-full" style={{ background: toColor.color }} />
        </div>

        {/* 모드 아이콘 */}
        <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-secondary text-subtle">
          <Icon name={meta.icon} size={20} strokeWidth={2} />
        </span>

        {/* from › to + 상세 */}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-1.5">
            <span className="text-[14px] font-bold text-ink">{from.name}</span>
            <Icon name="chevron-right" size={14} strokeWidth={2.4} className="text-faint" />
            <span className="text-[14px] font-bold text-ink">{to.name}</span>
          </span>
          <span className="truncate text-[12px] font-semibold text-subtle">
            {detail}
            {arrival.durationMin != null && (
              <span className="text-faint">
                {detail ? " · " : ""}약 {arrival.durationMin}분
              </span>
            )}
          </span>
        </div>

        {/* 모드 라벨 pill + 편집 */}
        <span className="flex-none rounded-pill bg-secondary px-2.5 py-1 text-[11.5px] font-bold whitespace-nowrap text-subtle">
          {meta.label}
        </span>
        {canEdit && (
          <button
            type="button"
            aria-label="이동 편집"
            onClick={() => setEditing(true)}
            className="flex size-8 flex-none items-center justify-center rounded-md text-mute transition-colors hover:bg-secondary hover:text-body"
          >
            <Icon name="pencil" size={15} strokeWidth={2} />
          </button>
        )}
      </div>
      <TransferEditor
        open={editing}
        onClose={() => setEditing(false)}
        tripId={tripId}
        transfer={transfer}
      />
    </>
  );
}

/** 이동 편집 모달 — 모드·이름·출발시각·소요분. 저장/삭제(비우기)는 useUpsertCityTransfer. */
function TransferEditor({
  open,
  onClose,
  tripId,
  transfer,
}: {
  open: boolean;
  onClose: () => void;
  tripId: string;
  transfer: { from: CitySegment; to: CitySegment };
}) {
  const { from, to } = transfer;
  const a = to.arrival ?? null;
  const upsert = useUpsertCityTransfer(tripId);

  const [mode, setMode] = useState<TransferMode>(a?.mode ?? "train");
  const [name, setName] = useState(a?.name ?? "");
  const [time, setTime] = useState(a?.time ?? "");
  const [duration, setDuration] = useState(
    a?.durationMin != null ? String(a.durationMin) : "",
  );

  const save = async () => {
    const durationMin = duration.trim() ? Number(duration) : null;
    await upsert.mutateAsync({
      cityId: to.cityId,
      arrival: {
        mode,
        name: name.trim() || null,
        time: time || null,
        durationMin: Number.isFinite(durationMin) ? durationMin : null,
      },
    });
    onClose();
  };

  const clear = async () => {
    await upsert.mutateAsync({ cityId: to.cityId, arrival: null });
    onClose();
  };

  const hasArrival = !!(a && (a.mode || a.name || a.time || a.durationMin != null));

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      variant="modal"
      width={420}
      icon="route"
      title={`${from.name} → ${to.name} 이동`}
      subtitle="도시가 바뀌는 날의 이동 수단·시간"
      loading={upsert.isPending}
      footer={
        <div className="flex w-full items-center gap-2.5">
          {hasArrival && (
            <Button
              variant="secondary"
              onClick={clear}
              className="h-11 flex-none border-danger/30 text-danger hover:bg-danger-tint"
            >
              이동 삭제
            </Button>
          )}
          <Button variant="primary" onClick={save} className="h-11 flex-1">
            저장
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-bold text-body">이동 수단</span>
        <div className="flex flex-wrap gap-1.5">
          {TRANSFER_MODES.map((m) => {
            const on = mode === m.value;
            return (
              <button
                key={m.value}
                type="button"
                aria-pressed={on}
                onClick={() => setMode(m.value)}
                className={cn(
                  "inline-flex h-[38px] items-center gap-1.5 rounded-pill border-[1.5px] px-3.5 text-[13px] font-semibold transition-colors",
                  on
                    ? "border-primary bg-primary-tint text-primary-hover"
                    : "border-line-strong bg-background text-subtle hover:bg-secondary",
                )}
              >
                <Icon name={m.icon} size={16} strokeWidth={2} />
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-bold text-body">이름</span>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 신칸센 노조미"
        />
      </div>

      <div className="flex gap-2.5">
        <div className="flex flex-1 flex-col gap-1.5">
          <span className="text-[12.5px] font-bold text-body">출발 시각</span>
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <span className="text-[12.5px] font-bold text-body">소요(분)</span>
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="예: 15"
          />
        </div>
      </div>
    </Dialog>
  );
}
