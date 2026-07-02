"use client";

import { Icon } from "@/components/ui/icon";

import { DEFAULT_ZOOM } from "./config";

/**
 * 커스텀 줌 컨트롤(+/−) — 기본 UI 를 끈 지도 위에 얹는다. 시안 zoom controls.
 * 색·치수는 토큰(--color-subtle, --color-line, radius).
 */
interface ZoomControlsProps {
  map: google.maps.Map | null;
}

export function ZoomControls({ map }: ZoomControlsProps) {
  const step = (delta: number) => {
    if (!map) return;
    const current = map.getZoom() ?? DEFAULT_ZOOM;
    map.setZoom(current + delta);
  };

  return (
    <div className="absolute right-4 bottom-4 flex flex-col overflow-hidden rounded-md border border-line bg-white shadow-[0_4px_14px_-4px_color-mix(in_srgb,var(--color-ink)_16%,transparent)]">
      <button
        type="button"
        aria-label="확대"
        onClick={() => step(1)}
        className="flex h-[38px] w-[38px] items-center justify-center border-b border-line text-subtle hover:bg-secondary"
      >
        <Icon name="plus" size={18} strokeWidth={2.2} />
      </button>
      <button
        type="button"
        aria-label="축소"
        onClick={() => step(-1)}
        className="flex h-[38px] w-[38px] items-center justify-center text-subtle hover:bg-secondary"
      >
        <Icon name="minus" size={18} strokeWidth={2.2} />
      </button>
    </div>
  );
}
