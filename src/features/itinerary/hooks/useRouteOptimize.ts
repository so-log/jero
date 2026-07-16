"use client";

import { useState } from "react";

import { buildCostMatrix } from "@/lib/route/costMatrix";
import { optimizeRoute, pathCost } from "@/lib/route/optimize";

import { useReorderPlaces } from "../api/useReorderPlaces";
import { scheduledWithCoords } from "../lib/selectors";
import type { PlaceDto } from "../types";

/** 최적화 미리보기(적용 전 제안). Haversine(km) 기준(설계 §2 — 실이동시간은 3단계). */
export interface RoutePreview {
  /** 'YYYY-MM-DD' 대상 날짜. */
  date: string;
  /** 제안 순서(그 날 전체 id — 좌표 있는 최적 순 + 좌표 없는 것 원순서 append). */
  order: string[];
  /** 미리보기 직전 순서(되돌리기·적용 취소 기준). */
  beforeOrder: string[];
  /** 최적화 전 총 이동(km, 현재 순서). */
  beforeKm: number;
  /** 최적화 후 총 이동(km). */
  afterKm: number;
  /** 좌표가 없어 최적화에서 제외된 장소 수(끝에 원순서 유지). */
  excludedCount: number;
}

interface Snapshot {
  date: string;
  order: string[];
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

/**
 * 동선 최적화 오케스트레이션(설계 §4). 계산은 순수 함수(lib/route) 위임, 저장은 기존 useReorderPlaces.
 * 컴포넌트 직접 fetch 금지 — 이 훅만 사용한다.
 */
export function useRouteOptimize(tripId: string) {
  const reorder = useReorderPlaces(tripId);
  const [preview, setPreview] = useState<RoutePreview | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  /** 최적화 좌표 개수(버튼 노출 판단용) — 2 미만이면 최적화 의미 없음. */
  const coordCount = (dayPlaces: PlaceDto[]): number =>
    scheduledWithCoords(dayPlaces).withCoords.length;

  /** 미리보기 계산(적용 안 함). 좌표 2곳 미만이면 no-op(null 유지). */
  const runPreview = (date: string, dayPlaces: PlaceDto[]): void => {
    const { withCoords, withoutCoords } = scheduledWithCoords(dayPlaces);
    if (withCoords.length < 2) return;

    const cost = buildCostMatrix(
      withCoords.map((p) => ({ lat: p.lat, lng: p.lng })),
    );
    const idx = optimizeRoute(cost);
    const identity = withCoords.map((_, i) => i);

    setPreview({
      date,
      order: [
        ...idx.map((i) => withCoords[i].id),
        ...withoutCoords.map((p) => p.id),
      ],
      beforeOrder: dayPlaces.map((p) => p.id),
      beforeKm: round1(pathCost(cost, identity)),
      afterKm: round1(pathCost(cost, idx)),
      excludedCount: withoutCoords.length,
    });
  };

  /** 미리보기 취소(적용 안 함). */
  const cancel = (): void => setPreview(null);

  /** 제안 순서 적용 → useReorderPlaces(낙관적 + reorder_places). 직전 순서를 되돌리기용으로 보관. */
  const apply = (): void => {
    if (!preview) return;
    setSnapshot({ date: preview.date, order: preview.beforeOrder });
    reorder.mutate({ date: preview.date, orderedIds: preview.order });
    setPreview(null);
  };

  /** 적용 직후 되돌리기 — 직전 순서로 재정렬. */
  const undo = (): void => {
    if (!snapshot) return;
    reorder.mutate({ date: snapshot.date, orderedIds: snapshot.order });
    setSnapshot(null);
  };

  return {
    preview,
    coordCount,
    runPreview,
    apply,
    cancel,
    undo,
    canUndo: snapshot !== null,
    isApplying: reorder.isPending,
  };
}
