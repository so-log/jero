import { act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PlaceDto, PlacesResponse } from "@/features/itinerary";
import { renderHookWithClient } from "@/test/utils";

// 실패 토글 스텁(낙관/롤백 검증) — useAutosaveMemo 테스트와 동일 패턴.
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

import { useMovePlaceCity } from "./useUpsertPlace";

const TID = "trip_1";
const KEY = ["places", TID];

function place(id: string, cityId: string | null): PlaceDto {
  return {
    id,
    name: id,
    category: "cafe",
    scheduled_date: null,
    order_in_day: null,
    start_time: null,
    duration_min: null,
    memo: null,
    lat: null,
    lng: null,
    city_id: cityId,
  };
}

function base(): PlacesResponse {
  return {
    trip: { id: TID, title: "T", start_date: "2026-04-18", end_date: "2026-04-21", my_role: "owner", cover_icon: "plane" },
    places: [place("s1", "c-tokyo")],
    saved_places: [place("p1", "c-tokyo"), place("p2", "c-osaka")],
    folders: [],
  };
}

describe("useMovePlaceCity (다중 도시 Phase 4)", () => {
  it("낙관적: 대상 장소 city_id 만 즉시 갱신", async () => {
    state.fail = false;
    const { client, result } = renderHookWithClient(() => useMovePlaceCity(TID));
    client.setQueryData(KEY, base());
    await act(async () => {
      await result.current.mutateAsync({ placeId: "p1", cityId: "c-osaka" });
    });
    const after = client.getQueryData<PlacesResponse>(KEY);
    expect(after?.saved_places.find((p) => p.id === "p1")?.city_id).toBe("c-osaka");
    // 다른 장소는 불변
    expect(after?.saved_places.find((p) => p.id === "p2")?.city_id).toBe("c-osaka");
    expect(after?.places.find((p) => p.id === "s1")?.city_id).toBe("c-tokyo");
  });

  it("미배정(null)으로 이동", async () => {
    state.fail = false;
    const { client, result } = renderHookWithClient(() => useMovePlaceCity(TID));
    client.setQueryData(KEY, base());
    await act(async () => {
      await result.current.mutateAsync({ placeId: "p1", cityId: null });
    });
    const after = client.getQueryData<PlacesResponse>(KEY);
    expect(after?.saved_places.find((p) => p.id === "p1")?.city_id).toBeNull();
  });

  it("실패 시 이전 city_id 로 롤백", async () => {
    state.fail = true;
    const { client, result } = renderHookWithClient(() => useMovePlaceCity(TID));
    client.setQueryData(KEY, base());
    await act(async () => {
      await result.current
        .mutateAsync({ placeId: "p1", cityId: "c-osaka" })
        .catch(() => {});
    });
    const after = client.getQueryData<PlacesResponse>(KEY);
    expect(after?.saved_places.find((p) => p.id === "p1")?.city_id).toBe("c-tokyo");
  });
});
