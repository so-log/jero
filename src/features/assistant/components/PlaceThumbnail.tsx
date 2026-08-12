"use client";

import { Icon } from "@/components/ui/icon";
import { CATEGORY, type CategoryKey } from "@/lib/constants/category";

/**
 * 추천 카드의 미니맵 썸네일 (시안 `miniMap`, 74×74).
 *
 * 시안과 동일하게 **양식화된 지도 배경 + 카테고리 핀**으로 그린다. 실제 타일(Static Maps)을
 * 쓰지 않는 이유: 카드마다 유료 이미지 요청이 발생하고, 74px 썸네일에서 지도 디테일은
 * 판독되지 않는다. 정확한 위치는 Phase 4 에서 "일정에 추가" 후 본 지도에서 확인된다.
 *
 * 좌표는 배경 무늬를 살짝 흔드는 시드로만 쓴다 — 카드마다 같은 그림이 반복되지 않게.
 */
export function PlaceThumbnail({
  category,
  lat,
  lng,
  size = 74,
}: {
  category: string;
  lat: number;
  lng: number;
  size?: number;
}) {
  const meta = CATEGORY[category as CategoryKey] ?? CATEGORY.etc;
  // 좌표 소수부로 도로 위치를 흔든다(결정적 — 같은 장소는 항상 같은 그림).
  const shiftX = Math.abs((lat * 1000) % 30) - 15;
  const shiftY = Math.abs((lng * 1000) % 30) - 15;

  return (
    <div
      className="relative flex-none overflow-hidden rounded-md bg-canvas"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 120 120"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
      >
        <rect width="120" height="120" className="fill-canvas" />
        {/* 수변(하천/만) */}
        <path
          d={`M-5 ${70 + shiftY} C25 ${60 + shiftY} 45 ${82 + shiftY} 75 ${72 + shiftY} S115 ${60 + shiftY} 125 ${70 + shiftY} L125 95 C95 105 65 88 40 98 S5 95 -5 88 Z`}
          className="fill-primary-tint"
        />
        {/* 도로 */}
        <g className="stroke-background" strokeWidth="5" strokeLinecap="round" opacity="0.9">
          <line x1={22 + shiftX} y1="-5" x2={38 + shiftX} y2="125" />
          <line x1="-5" y1={44 + shiftY} x2="125" y2={36 + shiftY} />
        </g>
        {/* 건물 블록 */}
        <g className="fill-line">
          <rect x="6" y="52" width="22" height="24" rx="4" />
          <rect x="86" y="46" width="26" height="26" rx="4" />
          <rect x="52" y="88" width="24" height="24" rx="4" />
        </g>
      </svg>

      {/* 카테고리 핀 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%]">
        <div
          className="flex size-[26px] rotate-45 items-center justify-center rounded-[50%_50%_50%_3px] shadow-card"
          style={{ background: meta.fg }}
        >
          <span className="-rotate-45">
            <Icon name={meta.icon} size={13} strokeWidth={2.2} className="text-white" />
          </span>
        </div>
      </div>
    </div>
  );
}
