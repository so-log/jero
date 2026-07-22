"use client";

import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { useMapsAuthFailed } from "./authFailure";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  GOOGLE_MAPS_API_KEY,
  MAP_OPTIONS,
  MAPS_LIBRARIES,
  MAPS_SCRIPT_ID,
} from "./config";
import { LiveCursorLayer } from "./LiveCursorLayer";
import { MapFallback } from "./MapFallback";
import { MapLegend } from "./MapLegend";
import { NumberedMarker } from "./NumberedMarker";
import { RouteLine } from "./RouteLine";
import { SavedMarker } from "./SavedMarker";
import type { LatLng, TripMapProps } from "./types";
import { ZoomControls } from "./ZoomControls";

/**
 * 실제 Google Maps 렌더(표현 전용). dynamic(ssr:false)로만 로드된다(TripMap 경유).
 * 동선 + 번호 마커 + 다이아 마커 + 실시간 커서 + 범례 + 줌. 카테고리 mute·선택 동기화.
 */
export function MapCanvas({
  scheduled,
  saved = [],
  filterToday = false,
  selectedId = null,
  activeCategory = "all",
  cursors = [],
  routeStyle = "solid",
  center,
  zoom,
  flyTo,
  flyToBounds,
  onSelect,
  onMapClick,
  onPointerMove,
  onPointerLeave,
  emptyOverlay,
  legend,
  className,
}: TripMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: MAPS_SCRIPT_ID,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: MAPS_LIBRARIES,
  });
  // 스크립트는 로드됐지만 지도 인증이 실패한 경우(referrer/key/billing) — loadError 와 동일 처리.
  const authFailed = useMapsAuthFailed();
  const [map, setMap] = useState<google.maps.Map | null>(null);

  // 동선: 일정 순서(order)대로 좌표 연결.
  const orderedScheduled = useMemo(
    () => [...scheduled].sort((a, b) => a.order - b.order),
    [scheduled],
  );
  const routePath = useMemo<LatLng[]>(
    () => orderedScheduled.map((p) => p.position),
    [orderedScheduled],
  );

  const allPositions = useMemo<LatLng[]>(
    () => [
      ...scheduled.map((p) => p.position),
      ...(filterToday ? [] : saved.map((p) => p.position)),
    ],
    [scheduled, saved, filterToday],
  );

  // 중심: center prop 우선, 없으면 마커에 fitBounds, 마커도 없으면 기본 도쿄.
  const applyView = useCallback(() => {
    if (!map) return;
    if (center) {
      map.setCenter(center);
      if (zoom != null) map.setZoom(zoom);
      return;
    }
    if (allPositions.length === 0) {
      map.setCenter(DEFAULT_CENTER);
      map.setZoom(DEFAULT_ZOOM);
      return;
    }
    if (allPositions.length === 1) {
      map.setCenter(allPositions[0]);
      map.setZoom(14);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    allPositions.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 64);
  }, [map, center, zoom, allPositions]);

  useEffect(() => {
    applyView();
  }, [applyView]);

  // 컨테이너가 숨김(0px)→표시로 전환될 때(모바일 리스트↔지도 토글·패널 리사이즈) 타일 리레이아웃 + 뷰 재적용.
  // display:none 상태로 초기화된 지도가 회색 타일로 남는 문제 방지. 데스크톱(항상 표시)에선 트리거되지 않음.
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!map || !el || typeof ResizeObserver === "undefined") return;
    let prevZero = el.offsetWidth === 0 || el.offsetHeight === 0;
    const ro = new ResizeObserver(() => {
      const zero = el.offsetWidth === 0 || el.offsetHeight === 0;
      if (prevZero && !zero) applyView();
      prevZero = zero;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [map, applyView]);

  // 검색 결과 선택 등 → 명령형 이동(사용자 드래그·fitBounds 와 충돌 없이). flyTo 가 바뀔 때만.
  useEffect(() => {
    if (!map || !flyTo) return;
    map.panTo(flyTo.position);
    if (flyTo.zoom != null) map.setZoom(flyTo.zoom);
  }, [map, flyTo]);

  // 도시 장소 묶음에 fit(다중 도시). applyView 자동 fit 이후 실행되도록 뒤에 배치 → 도시 bounds 가 우선.
  useEffect(() => {
    if (!map || !flyToBounds || flyToBounds.length === 0) return;
    if (flyToBounds.length === 1) {
      map.setCenter(flyToBounds[0]);
      map.setZoom(14);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    flyToBounds.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 64);
  }, [map, flyToBounds]);

  const onLoad = useCallback((instance: google.maps.Map) => setMap(instance), []);
  const onUnmount = useCallback(() => setMap(null), []);

  if (loadError || authFailed)
    return (
      <MapFallback variant="error" legend={legend} className={className} />
    );
  if (!isLoaded)
    return (
      <MapFallback variant="loading" legend={legend} className={className} />
    );

  const isEmpty = scheduled.length === 0 && (filterToday || saved.length === 0);

  return (
    <div
      ref={containerRef}
      className={cn("relative h-full w-full overflow-hidden", className)}
    >
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        options={MAP_OPTIONS}
        center={center ?? DEFAULT_CENTER}
        zoom={zoom ?? DEFAULT_ZOOM}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={
          onMapClick
            ? (e) => {
                if (!e.latLng) return;
                const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                // POI 라벨 클릭이면 placeId 동반 — 기본 인포윈도 억제하고 placeId 전달.
                const icon = e as google.maps.IconMouseEvent;
                if (icon.placeId) {
                  icon.stop();
                  onMapClick(pos, icon.placeId);
                  return;
                }
                onMapClick(pos);
              }
            : undefined
        }
        onMouseMove={
          onPointerMove
            ? (e) => {
                if (e.latLng)
                  onPointerMove({ lat: e.latLng.lat(), lng: e.latLng.lng() });
              }
            : undefined
        }
        onMouseOut={onPointerLeave}
      >
        <RouteLine path={routePath} style={routeStyle} />

        {!filterToday &&
          saved.map((marker) => (
            <SavedMarker
              key={marker.id}
              map={map}
              marker={marker}
              selected={selectedId === marker.id}
              onSelect={onSelect}
            />
          ))}

        {orderedScheduled.map((marker) => (
          <NumberedMarker
            key={marker.id}
            map={map}
            marker={marker}
            selected={selectedId === marker.id}
            muted={activeCategory !== "all" && marker.category !== activeCategory}
            onSelect={onSelect}
          />
        ))}

        <LiveCursorLayer map={map} cursors={cursors} />
      </GoogleMap>

      {isEmpty && emptyOverlay && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {emptyOverlay}
        </div>
      )}

      {legend === undefined ? <MapLegend /> : legend}
      <ZoomControls map={map} />
    </div>
  );
}
