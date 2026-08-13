"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/ui/icon";
import { deriveDays, usePlacesQuery } from "@/features/itinerary";
import { CATEGORY, type CategoryKey } from "@/lib/constants/category";

import type { AssistantActions } from "../hooks/useAssistantActions";
import type { CoursePlace, CoursePlan } from "../types";

/**
 * 코스 제안 블록 (기획 §3 H, 시안 `courseBlock`) — Day 타임라인 + 적용/동선 최적화.
 *
 * ★ 여기 보이는 것은 **제안일 뿐** 아직 아무것도 저장되지 않았다(설계 §5.1 "쓰기 도구 없음").
 *   실제 반영은 사용자가 "코스 적용"을 눌러 확인 다이얼로그를 통과했을 때만, 기존 뮤테이션으로 일어난다.
 *
 * viewer 는 실행 버튼 대신 읽기 전용 안내가 뜬다(기획 §7.1). 최종 차단은 서버 RLS(§8.2).
 */

/** Day 별로 묶고 각각 순서대로 정렬 — 모델이 순서를 뒤섞어 보내도 화면은 항상 정돈된다. */
function groupByDay(places: CoursePlace[]): { day: number; items: CoursePlace[] }[] {
  const byDay = new Map<number, CoursePlace[]>();
  for (const place of places) {
    const list = byDay.get(place.day);
    if (list) list.push(place);
    else byDay.set(place.day, [place]);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([day, items]) => ({
      day,
      items: [...items].sort((a, b) => a.order - b.order),
    }));
}

const fmtCost = (n: number, unit: "km" | "min"): string =>
  unit === "min" ? `${n}분` : `${n}km`;

function CourseItem({
  place,
  index,
  last,
}: {
  place: CoursePlace;
  index: number;
  last: boolean;
}) {
  const meta = CATEGORY[place.category as CategoryKey] ?? CATEGORY.etc;
  return (
    <div className={last ? "flex gap-2.5" : "flex gap-2.5 pb-2"}>
      {/* 순서 배지 + 연결선 */}
      <div className="flex w-5 flex-none flex-col items-center">
        <span className="flex size-5 items-center justify-center rounded-full bg-primary-tint text-[11px] font-extrabold text-primary-hover">
          {index + 1}
        </span>
        {last ? null : <span className="mt-0.5 min-h-3 w-0.5 flex-1 bg-line" />}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-px">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-flex size-[22px] flex-none items-center justify-center rounded-md"
            style={{ background: meta.bg, color: meta.fg }}
          >
            <Icon name={meta.icon} size={12} strokeWidth={2.2} />
          </span>
          <span className="flex-1 truncate text-[13px] font-bold text-body">
            {place.name}
          </span>
        </div>
        {place.reason ? (
          <span className="pl-[26px] text-[11.5px] leading-snug font-medium text-faint">
            {place.reason}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function CoursePlanBlock({
  tripId,
  messageId,
  course,
  canEdit,
  actions,
}: {
  tripId: string;
  /** 이 코스가 딸린 답변 id — 적용 결과를 답변 단위로 기억해 중복 적용을 막는다. */
  messageId: string;
  course: CoursePlan;
  canEdit: boolean;
  actions: AssistantActions;
}) {
  const { data } = usePlacesQuery(tripId);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const days = data ? deriveDays(data.trip.start_date, data.trip.end_date) : [];
  const groups = groupByDay(course.places);
  // ★ 적용 여부는 대화에 남는다 — 패널을 닫았다 열어도 "코스 적용"이 다시 뜨지 않는다(중복 생성 방지).
  const result = actions.resultFor(messageId);
  const preview = actions.optimizePreview;

  return (
    <div className="overflow-hidden rounded-panel border border-line bg-background shadow-card">
      <div className="flex items-center gap-2 border-b border-line-soft px-3 py-2.5">
        <span className="flex size-[26px] flex-none items-center justify-center rounded-md bg-violet-tint text-violet">
          <Icon name="route" size={15} strokeWidth={2} />
        </span>
        <span className="text-[13.5px] font-extrabold text-ink">
          {groups.length}일 코스 제안
        </span>
        <span className="ml-auto flex-none text-[11.5px] font-semibold text-mute">
          {course.places.length}곳
        </span>
      </div>

      {course.summary ? (
        <p className="px-3 pt-2.5 text-[12.5px] leading-relaxed font-medium text-subtle">
          {course.summary}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 px-3 py-2.5">
        {groups.map((group) => (
          <div key={group.day} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[12.5px] font-extrabold text-ink">
                Day {group.day}
              </span>
              <span className="text-[11.5px] font-semibold text-mute">
                {days[group.day - 1]?.date ?? ""}
              </span>
            </div>
            <div className="flex flex-col">
              {group.items.map((place, i) => (
                <CourseItem
                  key={`${place.googlePlaceId ?? place.name}-${i}`}
                  place={place}
                  index={i}
                  last={i === group.items.length - 1}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {!canEdit ? (
        <div className="flex items-center gap-1.5 border-t border-line-soft bg-surface px-3 py-2.5">
          <Icon name="eye" size={14} strokeWidth={2} className="flex-none text-mute" />
          <span className="text-[11.5px] font-semibold text-faint">
            읽기 전용 — 코스를 적용하려면 편집 권한이 필요해요
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-2 border-t border-line-soft px-3 py-2.5">
          {result ? (
            <>
              <span className="text-[12px] font-bold text-ink">
                {result.applied === result.total
                  ? `${result.applied}곳을 일정에 추가했어요`
                  : `${result.total}곳 중 ${result.applied}곳만 추가됐어요`}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-9 flex-1 gap-1.5"
                  onClick={() => void actions.undoCourse(messageId)}
                  disabled={actions.undoing || result.createdIds.length === 0}
                >
                  <Icon name="refresh" size={15} strokeWidth={2.2} />
                  {actions.undoing ? "되돌리는 중…" : "되돌리기"}
                </Button>
                {actions.optimizeDate && !preview ? (
                  <Button
                    variant="soft"
                    size="sm"
                    className="h-9 flex-1 gap-1.5"
                    onClick={() => void actions.runOptimize()}
                    disabled={actions.isPreviewing}
                  >
                    <Icon name="route" size={15} strokeWidth={2} />
                    {actions.isPreviewing ? "계산 중…" : "동선 최적화"}
                  </Button>
                ) : null}
              </div>
            </>
          ) : (
            <Button
              variant="primary"
              size="sm"
              className="h-[38px] w-full gap-1.5"
              onClick={() => setConfirmOpen(true)}
              disabled={actions.applying}
            >
              <Icon name="check" size={15} strokeWidth={2.4} />
              {actions.applying ? "적용 중…" : "코스 적용"}
            </Button>
          )}

          {/* 동선 최적화 미리보기 — 계산·저장은 기존 16번 훅이 그대로 한다(설계 §5.2-7). */}
          {preview ? (
            <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary-wash p-2.5">
              <span className="text-[12.5px] font-bold text-ink">
                총 이동 {fmtCost(preview.before, preview.unit)}
                <Icon
                  name="arrow-right"
                  size={13}
                  strokeWidth={2.4}
                  className="mx-1 inline align-[-1px] text-mute"
                />
                <span className="text-primary-hover">
                  {fmtCost(preview.after, preview.unit)}
                </span>
              </span>
              {preview.fellBack ? (
                <span className="text-[11px] font-medium text-warn">
                  실이동시간을 불러오지 못해 직선거리로 계산했어요
                </span>
              ) : null}
              <div className="flex gap-2">
                <Button
                  variant="soft"
                  size="sm"
                  className="h-9 flex-1 gap-1"
                  onClick={actions.cancelOptimize}
                >
                  <Icon name="x" size={15} strokeWidth={2.4} />
                  취소
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="h-9 flex-1 gap-1"
                  onClick={actions.applyOptimize}
                >
                  <Icon name="check" size={15} strokeWidth={2.6} />
                  순서 적용
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="코스를 일정에 적용할까요?"
        description={`장소 ${course.places.length}곳이 여행에 추가되고 Day 별 일정에 배정돼요. 적용 후 되돌릴 수 있어요.`}
        confirmLabel="적용"
        onConfirm={() => void actions.applyCourse(messageId, course)}
      />
    </div>
  );
}
