"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { usePlacesQuery } from "@/features/itinerary";

import { useUpdateTrip } from "../api/useUpdateTrip";
import { RangeCalendar } from "./RangeCalendar";

/**
 * 여행 날짜(기간) 수정 다이얼로그(B3) — owner 진입 전용(WorkspaceTopBar 날짜 클릭).
 * 공용 RangeCalendar 재사용(월 이동·범위 선택·시작≤종료·직접 입력). 저장은 useUpdateTrip seam(RLS owner 강제).
 * 엣지: 새 기간을 벗어난 배정 장소는 저장 전 ConfirmDialog 로 확인 후 미배정(저장만) 전환 — 데이터 유실 없음.
 */
interface TripDatesDialogProps {
  tripId: string;
  startDate: string;
  endDate: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TripDatesDialog({
  tripId,
  startDate,
  endDate,
  open,
  onOpenChange,
}: TripDatesDialogProps) {
  const { data } = usePlacesQuery(tripId);
  const updateTrip = useUpdateTrip();

  const [start, setStart] = useState(startDate);
  const [end, setEnd] = useState(endDate);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // 열릴 때 현재 여행 날짜로 초기화(렌더 중 조정 — effect 불필요).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setStart(startDate);
      setEnd(endDate);
      setConfirmOpen(false);
    }
  }

  const valid = !!start && !!end && start <= end;
  const changed = start !== startDate || end !== endDate;

  // 새 기간을 벗어난 배정 장소(축소 시) — 미배정 대상.
  const affected = valid
    ? (data?.places ?? []).filter(
        (p) => p.scheduled_date && (p.scheduled_date < start || p.scheduled_date > end),
      )
    : [];

  const runSave = () => {
    updateTrip.mutate(
      {
        tripId,
        start_date: start,
        end_date: end,
        unassignPlaceIds: affected.map((p) => p.id),
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  const handleSave = () => {
    if (!valid) return;
    if (affected.length > 0) setConfirmOpen(true);
    else runSave();
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        title="여행 날짜 수정"
        subtitle="기간을 바꾸면 플랜·캘린더에 바로 반영돼요"
        icon="calendar"
        width={460}
        loading={updateTrip.isPending}
        loadingText="날짜를 저장하는 중…"
        banner={updateTrip.isError ? updateTrip.error.message : null}
        footer={
          <div className="flex flex-1 items-center justify-end gap-2.5">
            <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!valid || !changed || updateTrip.isPending}
              onClick={handleSave}
            >
              저장
            </Button>
          </div>
        }
      >
        <RangeCalendar
          start={start}
          end={end}
          onChange={(s, e) => {
            setStart(s);
            setEnd(e);
          }}
          invalid={!!start && !!end && start > end}
          errorMessage="종료일은 시작일과 같거나 이후여야 해요"
        />
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`${affected.length}개 장소가 일정에서 빠져요`}
        description="새 기간을 벗어난 날짜의 장소는 저장 목록으로 옮겨져요(삭제되지 않아요). 계속할까요?"
        confirmLabel="날짜 변경"
        onConfirm={runSave}
      />
    </>
  );
}
