"use client";

import { MapMarker } from "./MapMarker";
import { MARKER } from "./tokens";
import type { ScheduledMarker } from "./types";

/**
 * 일정 장소 번호 마커(순서) — 시안 플랜 뷰.dc.html buildOverlay.
 * 색은 --primary / --color-primary-hover 토큰. 선택 시 채움+헤일로, mute 시 흐림.
 */
interface NumberedMarkerProps {
  map: google.maps.Map | null;
  marker: ScheduledMarker;
  selected: boolean;
  muted: boolean;
  onSelect?: (id: string) => void;
}

export function NumberedMarker({
  map,
  marker,
  selected,
  muted,
  onSelect,
}: NumberedMarkerProps) {
  return (
    <MapMarker
      map={map}
      position={marker.position}
      anchor="center"
      zIndex={selected ? 6 : 3}
      onClick={() => onSelect?.(marker.id)}
    >
      <div
        style={{
          position: "relative",
          width: MARKER.numbered.box,
          height: MARKER.numbered.box,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: muted ? 0.32 : 1,
          transition: "opacity .2s, transform .12s",
        }}
      >
        {selected && (
          <div
            style={{
              position: "absolute",
              inset: -MARKER.numbered.halo,
              borderRadius: "50%",
              background: "color-mix(in srgb, var(--primary) 18%, transparent)",
            }}
          />
        )}
        <div
          style={{
            position: "relative",
            width: MARKER.numbered.dot,
            height: MARKER.numbered.dot,
            borderRadius: "50%",
            background: selected ? "var(--primary)" : "#fff",
            border: "2px solid var(--primary)",
            color: selected ? "#fff" : "var(--color-primary-hover)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: MARKER.numbered.font,
            boxShadow:
              "0 3px 8px color-mix(in srgb, var(--primary) 32%, transparent)",
          }}
        >
          {marker.order}
        </div>
      </div>
    </MapMarker>
  );
}
