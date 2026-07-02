"use client";

import { OverlayViewF, OVERLAY_MOUSE_TARGET } from "@react-google-maps/api";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { supportsAdvancedMarkers } from "./config";
import type { LatLng, MarkerAnchor } from "./types";

/**
 * 커스텀 마커 프리미티브 — AdvancedMarkerElement 우선, 미지원 시 OverlayView 폴백.
 * 번호/다이아/커서 마커가 children 으로 자기 DOM 을 넣고, 위치·앵커·클릭만 위임한다.
 * Map ID 가 없으면(supportsAdvancedMarkers=false) 항상 OverlayView 경로로 동작한다.
 */
interface MapMarkerProps {
  /** AdvancedMarker 경로에 필요. OverlayView 경로는 GoogleMap 컨텍스트를 쓴다. */
  map: google.maps.Map | null;
  position: LatLng;
  anchor?: MarkerAnchor;
  zIndex?: number;
  clickable?: boolean;
  onClick?: () => void;
  children: ReactNode;
}

/** OverlayView: 점에 top-left 를 두고 inner transform 으로 앵커. */
const OVERLAY_TRANSFORM: Record<MarkerAnchor, string> = {
  center: "translate(-50%, -50%)",
  bottom: "translate(-50%, -100%)",
  topleft: "none",
};

/** AdvancedMarker: 기본 앵커가 bottom-center 라 거기서 desired 로 보정. */
const AME_TRANSFORM: Record<MarkerAnchor, string> = {
  center: "translateY(50%)",
  bottom: "none",
  topleft: "translate(50%, 100%)",
};

export function MapMarker(props: MapMarkerProps) {
  if (supportsAdvancedMarkers() && props.map) {
    return <AdvancedMarkerImpl {...props} map={props.map} />;
  }
  return <OverlayMarkerImpl {...props} />;
}

/** 폴백 경로 — @react-google-maps/api OverlayViewF. */
function OverlayMarkerImpl({
  position,
  anchor = "center",
  zIndex,
  clickable = true,
  onClick,
  children,
}: MapMarkerProps) {
  return (
    <OverlayViewF
      position={position}
      mapPaneName={OVERLAY_MOUSE_TARGET}
      getPixelPositionOffset={() => ({ x: 0, y: 0 })}
      zIndex={zIndex}
    >
      <div
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        onClick={clickable ? onClick : undefined}
        onKeyDown={
          clickable
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick?.();
                }
              }
            : undefined
        }
        style={{
          transform: OVERLAY_TRANSFORM[anchor],
          cursor: clickable ? "pointer" : "default",
          pointerEvents: clickable ? "auto" : "none",
        }}
      >
        {children}
      </div>
    </OverlayViewF>
  );
}

/** 우선 경로 — google.maps.marker.AdvancedMarkerElement + createPortal. */
function AdvancedMarkerImpl(props: MapMarkerProps & { map: google.maps.Map }) {
  const { map, anchor = "center", clickable = true, children } = props;

  // content 컨테이너 — 한 번만 생성(state 라 render 중 ref 접근 없음). 읽기만 하고 변경하지 않는다.
  const [container] = useState(() => document.createElement("div"));

  // 최신 props 를 effect/listener 안에서 읽기 위한 ref (effect 내 ref 접근은 허용).
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });

  // 마커 생성/해제 — map·container 기준 1회.
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(
    null,
  );
  useEffect(() => {
    const p = latest.current;
    const marker = new google.maps.marker.AdvancedMarkerElement({
      map,
      position: p.position,
      content: container,
      zIndex: p.zIndex,
      gmpClickable: p.clickable !== false,
    });
    const listener = marker.addListener("gmp-click", () =>
      latest.current.onClick?.(),
    );
    markerRef.current = marker;
    return () => {
      listener.remove();
      marker.map = null;
      markerRef.current = null;
    };
  }, [map, container]);

  // 위치/zIndex 갱신 — 재생성 없이(AME 객체는 useState 산물이 아니라 변경 가능).
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    marker.position = props.position;
    marker.zIndex = props.zIndex;
  }, [props.position, props.zIndex]);

  // 앵커 보정/포인터는 컨테이너가 아니라 내부 wrapper 에 적용(컨테이너 불변 유지).
  return createPortal(
    <div
      style={{
        transform: AME_TRANSFORM[anchor],
        pointerEvents: clickable ? "auto" : "none",
      }}
    >
      {children}
    </div>,
    container,
  );
}
