import { useState } from "react";

/**
 * 색은 globals.css @theme 토큰만 사용한다(하드코딩 금지, CLAUDE.md §7.1).
 * 마커 DOM 은 CSS 변수(var(--…))를 직접 쓰지만, Polyline 같은 Maps API 는
 * 문자열 색을 요구하므로 런타임에 토큰값을 해석해서 넘긴다(단일 출처 유지).
 */

/** :root 의 CSS 변수값을 읽는다(클라이언트). SSR/미해석 시 fallback. */
export function cssVar(name: string, fallback = ""): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

/**
 * 토큰값을 마운트 시 1회 해석 — Maps API(Polyline 등)에 넘길 색에 사용.
 * 클라이언트 전용 트리(dynamic ssr:false)에서만 쓰이므로 lazy initializer 로 충분(name 은 상수).
 */
export function useCssVar(name: string, fallback: string): string {
  const [value] = useState(() => cssVar(name, fallback));
  return value;
}

/**
 * 마커/동선 치수 — 시안(플랜 뷰.dc.html) 단일 출처. 색이 아닌 픽셀 스펙이라
 * 토큰셋에 없는 값은 여기 한 곳에 모은다(컴포넌트 산재 금지).
 */
export const MARKER = {
  /** 번호 마커: 외곽 박스 / 원 / 선택 헤일로 inset / 폰트 */
  numbered: { box: 34, dot: 30, halo: 5, font: 14 },
  /** 다이아(저장) 마커: 외곽 / 내부 아이콘 */
  saved: 27,
  savedIcon: 13,
  /** 커서 화살표 */
  cursor: 20,
} as const;

/** 동선(Polyline) 스펙 — 색은 --primary 토큰을 런타임 해석. */
export const ROUTE = {
  weight: 3,
  opacity: 0.85,
  /** dashed 반복 간격(시안 strokeDasharray '8 9' ≈ 17px) */
  dashRepeat: "17px",
} as const;
