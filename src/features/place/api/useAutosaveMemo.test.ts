import { act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PlaceDto, PlacesResponse } from "@/features/itinerary";
import { renderHookWithClient } from "@/test/utils";

// 실패 토글 스텁(낙관/롤백 검증).
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

import { useAutosaveMemo } from "./useUpsertPlace";

const TID = "trip_1";
const KEY = ["places", TID];

function place(id: string, memo: string | null): PlaceDto {
  return {
    id,
    name: id,
    category: "cafe",
    scheduled_date: null,
    order_in_day: null,
    start_time: null,
    duration_min: null,
    memo,
    lat: null,
    lng: null,
  };
}

function base(): PlacesResponse {
  return {
    trip: { id: TID, title: "T", start_date: "2026-08-01", end_date: "2026-08-02", my_role: "owner", cover_icon: "plane" },
    places: [place("s1", "옛 메모")],
    saved_places: [place("p1", null)],
    folders: [],
  };
}

describe("useAutosaveMemo (2차 F)", () => {
  it("낙관적: 대상 장소 memo 만 즉시 갱신", async () => {
    state.fail = false;
    const { client, result } = renderHookWithClient(() => useAutosaveMemo(TID));
    client.setQueryData(KEY, base());
    await act(async () => {
      await result.current.mutateAsync({ placeId: "p1", memo: "새 메모" });
    });
    const after = client.getQueryData<PlacesResponse>(KEY);
    expect(after?.saved_places.find((p) => p.id === "p1")?.memo).toBe("새 메모");
    // 다른 장소는 불변
    expect(after?.places.find((p) => p.id === "s1")?.memo).toBe("옛 메모");
  });

  it("실패 시 이전 memo 로 롤백", async () => {
    state.fail = true;
    const { client, result } = renderHookWithClient(() => useAutosaveMemo(TID));
    client.setQueryData(KEY, base());
    await act(async () => {
      await result.current.mutateAsync({ placeId: "p1", memo: "실패 메모" }).catch(() => {});
    });
    const after = client.getQueryData<PlacesResponse>(KEY);
    expect(after?.saved_places.find((p) => p.id === "p1")?.memo).toBeNull();
  });
});
