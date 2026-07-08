"use client";

import { MapMarker } from "./MapMarker";
import { MARKER } from "./tokens";
import type { LiveCursor } from "./types";

/**
 * 실시간 커서 레이어 — 타 멤버 포인터(화살표 + 이름 핀). 시안 buildOverlay(live cursors).
 * 위치·색·이름은 상위가 넘기는 cursors(LiveCursor[])로 렌더(2차 A: broadcast 실연동). 표현 전용·도메인 무관.
 * 색은 멤버 식별 색(profile.avatar_color, 계약 §4.1).
 */
interface LiveCursorLayerProps {
  map: google.maps.Map | null;
  cursors: LiveCursor[];
}

export function LiveCursorLayer({ map, cursors }: LiveCursorLayerProps) {
  return (
    <>
      {cursors.map((cursor) => (
        <MapMarker
          key={cursor.id}
          map={map}
          position={cursor.position}
          anchor="topleft"
          clickable={false}
          zIndex={9}
        >
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            <svg
              width={MARKER.cursor}
              height={MARKER.cursor}
              viewBox="0 0 24 24"
              fill={cursor.color}
              aria-hidden
              style={{
                filter:
                  "drop-shadow(0 1px 2px color-mix(in srgb, var(--color-ink) 30%, transparent))",
              }}
            >
              <path d="M5 3l14 7-6 1.5-2.5 6z" />
            </svg>
            <div
              style={{
                marginLeft: -2,
                marginTop: 13,
                background: cursor.color,
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 7px",
                borderRadius: 99,
                whiteSpace: "nowrap",
              }}
            >
              {cursor.name}
            </div>
          </div>
        </MapMarker>
      ))}
    </>
  );
}
