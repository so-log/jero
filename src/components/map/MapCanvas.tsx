"use client";

import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import { useCallback, useEffect, useMemo, useState } from "react";

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
  onSelect,
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
  useEffect(() => {
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
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        options={MAP_OPTIONS}
        center={center ?? DEFAULT_CENTER}
        zoom={zoom ?? DEFAULT_ZOOM}
        onLoad={onLoad}
        onUnmount={onUnmount}
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
