"use client";

import dynamic from "next/dynamic";

import { hasMapsKey } from "./config";
import { MapFallback } from "./MapFallback";
import type { TripMapProps } from "./types";

/**
 * 워크스페이스 지도 공개 진입점(04 플랜 · 06 장소 재사용 가능).
 * - 'use client' + dynamic(ssr:false): Maps SDK 는 브라우저 전용이라 서버 렌더 제외.
 * - 키 없을 때도 안 깨지게 자리표시(MapFallback)로 분기 — 레이아웃 유지.
 */
const MapCanvas = dynamic(
  () => import("./MapCanvas").then((m) => m.MapCanvas),
  {
    ssr: false,
    loading: () => <MapFallback variant="loading" />,
  },
);

export function TripMap(props: TripMapProps) {
  if (!hasMapsKey) {
    return (
      <MapFallback
        variant="no-key"
        legend={props.legend}
        className={props.className}
      />
    );
  }
  return <MapCanvas {...props} />;
}
