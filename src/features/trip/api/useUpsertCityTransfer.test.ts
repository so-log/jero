import { act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderHookWithClient } from "@/test/utils";

import type { TripCity } from "../lib/citySchedule";

const state = vi.hoisted(() => ({ fail: false }));
vi.mock("@/lib/supabase/env", () => ({ hasSupabase: true }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      update: () => ({
        eq: () => Promise.resolve({ error: state.fail ? { message: "x" } : null }),
      }),
    }),
  }),
}));

import { useUpsertCityTransfer } from "./useUpsertCityTransfer";

const TID = "trip_1";
const KEY = ["cities", TID];

const CITIES: TripCity[] = [
  { id: "c-tokyo", name: "도쿄", country: null, lat: null, lng: null, nights: 2, seq: 0 },
  { id: "c-osaka", name: "오사카", country: null, lat: null, lng: null, nights: 1, seq: 1, arrival: null },
];

describe("useUpsertCityTransfer (다중 도시 Phase 5)", () => {
  it("낙관적: 대상 도시 arrival 만 즉시 갱신", async () => {
    state.fail = false;
    const { client, result } = renderHookWithClient(() => useUpsertCityTransfer(TID));
    client.setQueryData(KEY, CITIES);
    await act(async () => {
      await result.current.mutateAsync({
        cityId: "c-osaka",
        arrival: { mode: "train", name: "한큐", time: "09:30", durationMin: 45 },
      });
    });
    const after = client.getQueryData<TripCity[]>(KEY);
    expect(after?.find((c) => c.id === "c-osaka")?.arrival).toMatchObject({
      mode: "train",
      durationMin: 45,
    });
    // 다른 도시는 불변
    expect(after?.find((c) => c.id === "c-tokyo")?.arrival ?? null).toBeNull();
  });

  it("arrival=null 로 이동 삭제", async () => {
    state.fail = false;
    const { client, result } = renderHookWithClient(() => useUpsertCityTransfer(TID));
    client.setQueryData(KEY, [
      { ...CITIES[1], arrival: { mode: "bus", name: "x", time: null, durationMin: 10 } },
    ]);
    await act(async () => {
      await result.current.mutateAsync({ cityId: "c-osaka", arrival: null });
    });
    const after = client.getQueryData<TripCity[]>(KEY);
    expect(after?.[0].arrival).toBeNull();
  });

  it("실패 시 이전 상태로 롤백", async () => {
    state.fail = true;
    const { client, result } = renderHookWithClient(() => useUpsertCityTransfer(TID));
    client.setQueryData(KEY, CITIES);
    await act(async () => {
      await result.current
        .mutateAsync({
          cityId: "c-osaka",
          arrival: { mode: "flight", name: "실패", time: null, durationMin: null },
        })
        .catch(() => {});
    });
    const after = client.getQueryData<TripCity[]>(KEY);
    expect(after?.find((c) => c.id === "c-osaka")?.arrival ?? null).toBeNull();
  });
});
