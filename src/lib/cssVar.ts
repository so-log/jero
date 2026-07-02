"use client";

import { useState } from "react";

/**
 * @theme 토큰값(CSS 변수)을 런타임에 해석. 색 하드코딩 금지(§7.1) — 문자열 색을 요구하는
 * 라이브러리(Recharts fill 등)에 토큰값을 넘길 때 사용.
 */
export function cssVar(name: string, fallback = ""): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

/** 마운트 시 1회 해석(클라이언트). name 은 상수 전제. */
export function useCssVar(name: string, fallback: string): string {
  const [value] = useState(() => cssVar(name, fallback));
  return value;
}
