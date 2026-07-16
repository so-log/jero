import { act, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderHookWithClient } from "@/test/utils";

import { placesForDay } from "../lib/selectors";
import type { PlaceDto, PlacesResponse } from "../types";
import { useRouteOptimize } from "./useRouteOptimize";

/**
 * 동선 최적화 훅(2차) — preview 계산(before/after) → apply(reorder 캐시 반영) → undo 복원.
 * useReorderPlaces 스텁(키 없음)이 ['places',tripId] 캐시를 낙관적으로 재배치한다.
 */
const TRIP = "t1";
const KEY = ["places", TRIP];
const DATE = "2026-08-01";

// 적도 위 경도만 다른 점 → 거리 |Δlng| 단조. 배정순(order_in_day) 은 지그재그(A→C→B 가 최적).
const place = (
  id: string,
  order: number,
  lng: number | null,
): PlaceDto => ({
  id,
  name: id,
  category: "cafe",
  scheduled_date: DATE,
  order_in_day: order,
  start_time: null,
  duration_min: null,
  memo: null,
  lat: lng === null ? null : 0,
  lng,
});

function makeResponse(): PlacesResponse {
  return {
    trip: {
      id: TRIP,
      title: "T",
      start_date: DATE,
      end_date: DATE,
      my_role: "owner",
    },
    places: [
      place("A", 1, 0),
      place("B", 2, 5),
      place("C", 3, 1),
      place("N", 4, null), // 좌표 없음 → 최적화 제외, 끝 유지
    ],
    saved_places: [],
    folders: [],
  } as unknown as PlacesResponse;
}

describe("useRouteOptimize", () => {
  it("preview: after ≤ before, 제안 순서는 순열 + 좌표없는 장소는 끝, excludedCount", () => {
    const { client, result } = renderHookWithClient(() => useRouteOptimize(TRIP));
    client.setQueryData<PlacesResponse>(KEY, makeResponse());
    const dayPlaces = placesForDay(makeResponse().places, DATE);

    act(() => result.current.runPreview(DATE, dayPlaces));

    const preview = result.current.preview;
    expect(preview).not.toBeNull();
    expect(preview!.afterKm).toBeLessThanOrEqual(preview!.beforeKm);
    // 지그재그(A,B,C)라 실제로 줄어야 함
    expect(preview!.afterKm).toBeLessThan(preview!.beforeKm);
    expect(preview!.excludedCount).toBe(1);
    expect(preview!.order).toHaveLength(4);
    expect([...preview!.order].sort()).toEqual(["A", "B", "C", "N"]);
    expect(preview!.order[preview!.order.length - 1]).toBe("N"); // 좌표없는 것 끝
    // 최적 순서: A(0)→C(1)→B(5), 뒤에 N
    expect(preview!.order).toEqual(["A", "C", "B", "N"]);
  });

  it("coordCount<2 면 preview 안 만든다(no-op)", () => {
    const { client, result } = renderHookWithClient(() => useRouteOptimize(TRIP));
    const one: PlacesResponse = {
      ...makeResponse(),
      places: [place("A", 1, 0), place("N", 2, null)],
    };
    client.setQueryData<PlacesResponse>(KEY, one);
    act(() => result.current.runPreview(DATE, placesForDay(one.places, DATE)));
    expect(result.current.preview).toBeNull();
  });

  it("apply: reorder 로 캐시 순서 갱신 + canUndo, undo: 직전 순서 복원", async () => {
    const { client, result } = renderHookWithClient(() => useRouteOptimize(TRIP));
    client.setQueryData<PlacesResponse>(KEY, makeResponse());
    const dayPlaces = placesForDay(makeResponse().places, DATE);

    act(() => result.current.runPreview(DATE, dayPlaces));
    act(() => result.current.apply());

    await waitFor(() => {
      const data = client.getQueryData<PlacesResponse>(KEY);
      expect(placesForDay(data!.places, DATE).map((p) => p.id)).toEqual([
        "A",
        "C",
        "B",
        "N",
      ]);
    });
    expect(result.current.preview).toBeNull();
    expect(result.current.canUndo).toBe(true);

    act(() => result.current.undo());
    await waitFor(() => {
      const data = client.getQueryData<PlacesResponse>(KEY);
      expect(placesForDay(data!.places, DATE).map((p) => p.id)).toEqual([
        "A",
        "B",
        "C",
        "N",
      ]);
    });
    expect(result.current.canUndo).toBe(false);
  });
});
