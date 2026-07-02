"use client";

import { Icon } from "@/components/ui/icon";
import { CATEGORY } from "@/lib/constants/category";

import { MapMarker } from "./MapMarker";
import { MARKER } from "./tokens";
import type { SavedMarker as SavedMarkerData } from "./types";

/**
 * 저장 장소 다이아 마커 — 시안 플랜 뷰.dc.html buildOverlay(saved markers).
 * 흰 면 + 회전한 라운드 사각(다이아), 카테고리 아이콘. 색은 --color-line-strong/faint 토큰.
 */
interface SavedMarkerProps {
  map: google.maps.Map | null;
  marker: SavedMarkerData;
  selected: boolean;
  onSelect?: (id: string) => void;
}

export function SavedMarker({
  map,
  marker,
  selected,
  onSelect,
}: SavedMarkerProps) {
  return (
    <MapMarker
      map={map}
      position={marker.position}
      anchor="bottom"
      zIndex={selected ? 5 : 1}
      onClick={() => onSelect?.(marker.id)}
    >
      <div
        style={{
          width: MARKER.saved,
          height: MARKER.saved,
          borderRadius: "50% 50% 50% 3px",
          background: "#fff",
          border: `1.5px solid ${
            selected ? "var(--color-faint)" : "var(--color-line-strong)"
          }`,
          boxShadow: "0 2px 7px color-mix(in srgb, var(--color-ink) 16%, transparent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: "rotate(45deg)",
        }}
      >
        <div style={{ transform: "rotate(-45deg)", display: "flex" }}>
          <Icon
            name={CATEGORY[marker.category].icon}
            size={MARKER.savedIcon}
            strokeWidth={2}
            color="var(--color-faint)"
          />
        </div>
      </div>
    </MapMarker>
  );
}
