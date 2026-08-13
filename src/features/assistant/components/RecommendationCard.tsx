"use client";

import { useState } from "react";

import { usePlanStore } from "@/features/itinerary";
import { Icon } from "@/components/ui/icon";
import { CATEGORY, type CategoryKey } from "@/lib/constants/category";

import type { AssistantActions } from "../hooks/useAssistantActions";
import type { PlaceCard } from "../types";
import { PlaceThumbnail } from "./PlaceThumbnail";

/**
 * 추천 장소 카드 (기획 §3 F·G, 시안 `recCard`).
 * 미니맵 썸네일 74×74 + 이름 + 카테고리 pill + 주소 + 액션 2버튼.
 *
 * ★ 여기 오는 것은 **Google Places 로 실존이 확인된 장소뿐**이다(설계 §4).
 *   모델이 본문에 지어낸 이름은 카드가 되지 않으므로 "저장·일정에 추가" 액션도 붙지 않는다.
 *
 * viewer 는 액션 영역이 렌더되지 않는다(기획 §7.1). 숨김은 편의일 뿐이고,
 * 실제 차단은 서버 RLS(`place` editor+)가 한다(§8.2 "UI 에서 감추는 것은 보안이 아니다").
 *
 * 액션은 전부 `useAssistantActions` 경유 — 컴포넌트에서 직접 fetch 하지 않는다(§7.1).
 */

type Done = "saved" | "scheduled" | null;

export function RecommendationCard({
  place,
  canEdit,
  actions,
}: {
  place: PlaceCard;
  canEdit: boolean;
  actions: AssistantActions;
}) {
  const meta = CATEGORY[place.category as CategoryKey] ?? CATEGORY.etc;
  // "+ 일정에" 의 대상은 **지금 보고 있는 Day** 다(플랜 뷰 선택 상태).
  const activeDay = usePlanStore((s) => s.activeDay);
  const day = activeDay + 1;

  const [done, setDone] = useState<Done>(null);
  const [failed, setFailed] = useState(false);
  const busy = actions.busyCard === place.googlePlaceId;

  const run = async (kind: Exclude<Done, null>) => {
    setFailed(false);
    const ok =
      kind === "saved"
        ? await actions.savePlace(place)
        : await actions.addToSchedule(place, day);
    if (ok) setDone(kind);
    else setFailed(true);
  };

  return (
    <div className="flex gap-2.5 rounded-panel border border-line bg-background p-2.5 shadow-card">
      <PlaceThumbnail category={place.category} lat={place.lat} lng={place.lng} />

      <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-bold text-ink">{place.name}</span>
          <span
            className="inline-flex flex-none items-center gap-1 rounded-pill py-0.5 pr-2 pl-1.5"
            style={{ background: meta.bg }}
          >
            <Icon
              name={meta.icon}
              size={11}
              strokeWidth={2.2}
              style={{ color: meta.fg }}
            />
            <span className="text-[10.5px] font-bold" style={{ color: meta.fg }}>
              {meta.label}
            </span>
          </span>
        </div>

        {place.address ? (
          <div className="flex items-center gap-1">
            <Icon name="map-pin" size={12} strokeWidth={2} className="flex-none text-mute" />
            <span className="truncate text-[11.5px] font-medium text-mute">
              {place.address}
            </span>
          </div>
        ) : null}

        {canEdit ? (
          <div className="mt-0.5 flex flex-col gap-1">
            {done ? (
              <span className="inline-flex h-[34px] items-center gap-1.5 text-xs font-bold text-success">
                <Icon name="check" size={13} strokeWidth={2.4} />
                {done === "saved" ? "장소에 저장했어요" : `Day ${day} 일정에 추가했어요`}
              </span>
            ) : (
              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run("saved")}
                  className="inline-flex h-[34px] flex-1 items-center justify-center gap-1.5 rounded-md border border-line bg-background text-xs font-bold text-subtle transition hover:bg-secondary disabled:opacity-50"
                >
                  <Icon name="bookmark" size={13} strokeWidth={2} />
                  저장
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run("scheduled")}
                  title={`Day ${day} 일정에 추가`}
                  aria-label={`Day ${day} 일정에 추가`}
                  className="inline-flex h-[34px] flex-1 items-center justify-center gap-1.5 rounded-md bg-primary-tint text-xs font-bold text-primary-hover transition hover:bg-primary-tint/70 disabled:opacity-50"
                >
                  <Icon name="plus" size={13} strokeWidth={2.4} />
                  일정에
                </button>
              </div>
            )}
            {failed ? (
              <span className="text-[11px] font-semibold text-danger">
                추가하지 못했어요. 잠시 후 다시 시도해주세요.
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
