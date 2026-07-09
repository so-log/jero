"use client";

import { PolylineF } from "@react-google-maps/api";
import { useMemo } from "react";

import { ROUTE, useCssVar } from "./tokens";
import type { LatLng, RouteStyle } from "./types";

/**
 * 동선 — 일정 순서대로 연결(시안 buildOverlay route). 색은 --primary 토큰을 런타임 해석.
 * dashed 는 Maps API 의 dot 심볼 반복으로 구현(SVG strokeDasharray 대응).
 */
interface RouteLineProps {
  path: LatLng[];
  style?: RouteStyle;
}

export function RouteLine({ path, style = "solid" }: RouteLineProps) {
  const color = useCssVar("--primary", "#3172e3");

  const options = useMemo<google.maps.PolylineOptions>(() => {
    if (style === "dashed") {
      return {
        strokeOpacity: 0,
        strokeColor: color,
        icons: [
          {
            icon: {
              path: "M 0,-1 0,1",
              strokeOpacity: ROUTE.opacity,
              strokeColor: color,
              strokeWeight: ROUTE.weight,
              scale: 1,
            },
            offset: "0",
            repeat: ROUTE.dashRepeat,
          },
        ],
      };
    }
    return {
      strokeColor: color,
      strokeOpacity: ROUTE.opacity,
      strokeWeight: ROUTE.weight,
    };
  }, [color, style]);

  if (path.length < 2) return null;
  return <PolylineF path={path} options={options} />;
}
