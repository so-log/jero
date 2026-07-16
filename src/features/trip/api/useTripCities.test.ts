import { waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderHookWithClient } from "@/test/utils";

import { useTripCities } from "./useTripCities";

/** 다중 도시 Phase 1 — 도시 쿼리 훅 배선. 키 없는(테스트) 환경은 [](도시 축 미노출). */
describe("useTripCities", () => {
  it("Supabase 키 없으면 빈 배열(하위호환 no-op)", async () => {
    const { result } = renderHookWithClient(() => useTripCities("t1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});
