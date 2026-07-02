"use client";

import { useSyncExternalStore } from "react";

/**
 * Google Maps 인증 실패 방어 — 스크립트는 정상 로드됐지만(useJsApiLoader.loadError=없음)
 * 지도 인증이 실패(RefererNotAllowedMapError·InvalidKeyMapError·billing 등)하면 Google 은
 * 전역 `window.gm_authFailure` 를 호출한다. 이걸 구독해 MapCanvas 가 loadError 와 동일하게
 * error fallback 으로 분기하도록 한다(그대로 두면 GoogleMap 이 렌더돼 상호작용이 에러 바운더리로 튐).
 *
 * 외부 전역 콜백을 구독하는 store 라 useSyncExternalStore 로 노출한다. 네트워크/fetch 아님(§7.1).
 */
declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

let authFailed = false;
const listeners = new Set<() => void>();

// 모듈 로드(=지도 번들 로드) 시 1회 등록 — 인증 검증보다 먼저 핸들러가 준비되도록.
if (typeof window !== "undefined") {
  const previous = window.gm_authFailure;
  window.gm_authFailure = () => {
    authFailed = true;
    listeners.forEach((notify) => notify());
    previous?.();
  };
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** 지도 인증 실패 여부(전역). 실패 시 true 로 고정되고 구독자에 통지된다. */
export function useMapsAuthFailed(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => authFailed,
    () => false,
  );
}

/** 테스트 전용 — 전역 플래그 리셋(모듈 싱글턴이라 케이스 간 격리용). */
export function __resetMapsAuthFailedForTest(): void {
  authFailed = false;
  listeners.clear();
}
