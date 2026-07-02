import { act, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderHookWithClient } from "@/test/utils";

import { placesForDay } from "../lib/selectors";
import type { PlacesResponse } from "../types";
import { PLAN_FIXTURE } from "./fixtures";
import { useReorderPlaces } from "./useReorderPlaces";

/**
 * 드래그 재정렬 seam(스텁) — 낙관적으로 ['places',id] 캐시를 재배치한다(설계 §9·§10).
 * 백엔드 전이므로 mutationFn 은 즉시 성공(스텁)하고 캐시를 유지한다.
 */
const DATE = "2026-04-18";
const KEY = ["places", "trip_1"];

describe("useReorderPlaces", () => {
  it("mutate 시 캐시의 order_in_day 가 새 순서로 갱신되고(낙관적) 뮤테이션이 성공한다", async () => {
    const { client, result } = renderHookWithClient(() =>
      useReorderPlaces("trip_1"),
    );
    client.setQueryData<PlacesResponse>(KEY, PLAN_FIXTURE);

    const before = placesForDay(PLAN_FIXTURE.places, DATE).map((p) => p.id);
    const next = [...before.slice(1), before[0]]; // 첫 항목을 맨 뒤로

    act(() => {
      result.current.mutate({ date: DATE, orderedIds: next });
    });

    // 낙관적 갱신: 캐시가 새 순서로 즉시 재배치
    await waitFor(() => {
      const data = client.getQueryData<PlacesResponse>(KEY);
      expect(placesForDay(data!.places, DATE).map((p) => p.id)).toEqual(next);
    });
    // 스텁 뮤테이션 호출 완료
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.variables).toEqual({ date: DATE, orderedIds: next });
  });
});
