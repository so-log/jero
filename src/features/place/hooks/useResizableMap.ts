"use client";

import {
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  clampMapWidth,
  MAP_COLLAPSED_KEY,
  MAP_DEFAULT_WIDTH,
  MAP_KEY_STEP,
  MAP_WIDTH_KEY,
} from "../lib/resize";

/**
 * 장소 뷰 지도 패널 리사이즈/접기(설계 §6 UX) — 드래그·키보드 폭 조절 + 접힘 토글 + localStorage 유지.
 * 상태 경계: 순수 UI 상태라 로컬(hook). 좌표/데이터 등 도메인과 무관(additive).
 */
export function useResizableMap(containerRef: RefObject<HTMLDivElement | null>) {
  const [width, setWidth] = useState(MAP_DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);

  // 마운트 시 localStorage 복원(SSR 안전 — effect 내부).
  useEffect(() => {
    try {
      const raw = Number(localStorage.getItem(MAP_WIDTH_KEY));
      if (Number.isFinite(raw) && raw > 0) {
        const cw = containerRef.current?.getBoundingClientRect().width ?? 0;
        setWidth(clampMapWidth(raw, cw));
      }
      setCollapsed(localStorage.getItem(MAP_COLLAPSED_KEY) === "1");
    } catch {
      // 접근 불가(프라이빗 모드 등) → 기본값 유지.
    }
  }, [containerRef]);

  const lockCursor = (on: boolean) => {
    document.body.style.cursor = on ? "col-resize" : "";
    document.body.style.userSelect = on ? "none" : "";
  };

  const applyWidth = useCallback(
    (raw: number) => {
      const cw = containerRef.current?.getBoundingClientRect().width ?? 0;
      const w = clampMapWidth(raw, cw);
      setWidth(w);
      try {
        localStorage.setItem(MAP_WIDTH_KEY, String(w));
      } catch {
        /* ignore */
      }
      return w;
    },
    [containerRef],
  );

  const onHandlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (collapsed) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      draggingRef.current = true;
      setDragging(true);
      lockCursor(true);
    },
    [collapsed],
  );

  const onHandlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (!draggingRef.current) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      // 지도 폭 = 포인터 위치에서 컨테이너 오른쪽 끝까지의 거리.
      applyWidth(rect.right - e.clientX);
    },
    [containerRef, applyWidth],
  );

  const onHandlePointerUp = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    lockCursor(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const onHandleKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLElement>) => {
      if (collapsed) return;
      // 왼쪽 = 지도 넓게, 오른쪽 = 좁게(핸들이 지도 좌측 경계).
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        applyWidth(width + MAP_KEY_STEP);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        applyWidth(width - MAP_KEY_STEP);
      }
    },
    [collapsed, width, applyWidth],
  );

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(MAP_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  // 언마운트 시 커서 락 확실히 해제(드래그 중 라우트 이탈 방어).
  useEffect(() => () => lockCursor(false), []);

  return {
    width,
    collapsed,
    dragging,
    onHandlePointerDown,
    onHandlePointerMove,
    onHandlePointerUp,
    onHandleKeyDown,
    toggleCollapsed,
  };
}
