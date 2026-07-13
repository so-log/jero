"use client";

import { useRef } from "react";

import { type PlaceSelection, usePlacesAutocomplete } from "@/components/map";
import { Icon } from "@/components/ui/icon";

/**
 * 지도 위 플로팅 검색창(06) — 지도에서 장소 검색 → 선택 시 상위가 지도 이동 + "장소 추가" 프리필.
 * 기존 usePlacesAutocomplete(Places Autocomplete) 재사용(§7.2). 컴포넌트 직접 fetch 없음.
 * canEdit 게이트는 상위(PlacesView)에서. 지도 패널(relative) 안에 absolute 로 얹힌다.
 */
export function MapSearchBox({
  onSelect,
}: {
  onSelect: (selection: PlaceSelection) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  usePlacesAutocomplete(inputRef, onSelect);

  return (
    <div className="absolute top-3.5 left-3.5 z-10 w-[min(320px,calc(100%-28px))]">
      <div className="flex h-11 items-center gap-2 rounded-md border border-line-strong bg-background/95 px-3 shadow-elevated backdrop-blur focus-within:border-primary focus-within:shadow-focus">
        <Icon
          name="search"
          size={16}
          strokeWidth={2.2}
          className="flex-none text-faint"
        />
        <input
          ref={inputRef}
          type="text"
          aria-label="지도에서 장소 검색"
          placeholder="지도에서 장소 검색"
          className="min-w-0 flex-1 bg-transparent text-[13.5px] font-medium text-ink outline-none placeholder:text-faint"
        />
      </div>
    </div>
  );
}
