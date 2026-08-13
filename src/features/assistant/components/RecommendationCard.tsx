"use client";

import { Icon } from "@/components/ui/icon";
import { CATEGORY, type CategoryKey } from "@/lib/constants/category";

import type { PlaceCard } from "../types";
import { PlaceThumbnail } from "./PlaceThumbnail";

/**
 * 추천 장소 카드 (기획 §3 F·G, 시안 `recCard`).
 * 미니맵 썸네일 74×74 + 이름 + 카테고리 pill + 주소 + 액션 2버튼.
 *
 * ★ 여기 오는 것은 **Google Places 로 실존이 확인된 장소뿐**이다(설계 §4).
 *   모델이 본문에 지어낸 이름은 카드가 되지 않으므로 "저장·일정에 추가" 액션도 붙지 않는다.
 *
 * viewer 는 액션 영역이 렌더되지 않는다(기획 §7.1).
 * ★ Phase 3 범위: 카드 렌더까지. 버튼 실제 배선(저장·일정 배정)은 **Phase 4**.
 */
export function RecommendationCard({
  place,
  canEdit,
}: {
  place: PlaceCard;
  canEdit: boolean;
}) {
  const meta = CATEGORY[place.category as CategoryKey] ?? CATEGORY.etc;

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
          <div className="mt-0.5 flex gap-1.5">
            <button
              type="button"
              disabled
              title="Phase 4 에서 연결됩니다"
              className="inline-flex h-[34px] flex-1 items-center justify-center gap-1.5 rounded-md border border-line bg-background text-xs font-bold text-subtle transition hover:bg-secondary disabled:opacity-50"
            >
              <Icon name="bookmark" size={13} strokeWidth={2} />
              저장
            </button>
            <button
              type="button"
              disabled
              title="Phase 4 에서 연결됩니다"
              className="inline-flex h-[34px] flex-1 items-center justify-center gap-1.5 rounded-md bg-primary-tint text-xs font-bold text-primary-hover transition hover:bg-primary-tint/70 disabled:opacity-50"
            >
              <Icon name="plus" size={13} strokeWidth={2.4} />
              일정에
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
