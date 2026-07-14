import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderHookWithClient } from "@/test/utils";

import { useUpdateTrip } from "./useUpdateTrip";

// hasSupabase=true 경로 — trip 기간 update + 범위 밖 장소 미배정(place update .in).
vi.mock("@/lib/supabase/env", () => ({ hasSupabase: true }));

const tripEq = vi.fn(() => ({ error: null }));
const tripUpdate = vi.fn(() => ({ eq: tripEq }));
const placeIn = vi.fn(() => ({ error: null }));
const placeUpdate = vi.fn(() => ({ in: placeIn }));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: (table: string) =>
      table === "trip" ? { update: tripUpdate } : { update: placeUpdate },
  }),
}));

describe("useUpdateTrip — 기간 수정 + 범위 밖 미배정(B3)", () => {
  beforeEach(() => {
    tripUpdate.mockClear();
    tripEq.mockClear();
    placeUpdate.mockClear();
    placeIn.mockClear();
  });

  it("trip.start_date·end_date 를 update 하고 대상 장소를 미배정한다", async () => {
    const { result } = renderHookWithClient(() => useUpdateTrip());
    await act(async () => {
      await result.current.mutateAsync({
        tripId: "trip_1",
        start_date: "2026-05-02",
        end_date: "2026-05-04",
        unassignPlaceIds: ["p1", "p2"],
      });
    });

    expect(tripUpdate).toHaveBeenCalledWith({
      start_date: "2026-05-02",
      end_date: "2026-05-04",
    });
    expect(tripEq).toHaveBeenCalledWith("id", "trip_1");
    // 미배정: scheduled_date/order/scheduled_by null → 저장 목록으로(삭제 아님).
    expect(placeUpdate).toHaveBeenCalledWith({
      scheduled_date: null,
      order_in_day: null,
      scheduled_by: null,
    });
    expect(placeIn).toHaveBeenCalledWith("id", ["p1", "p2"]);
  });

  it("범위 밖 장소가 없으면 place update 는 호출하지 않는다(기간만 변경)", async () => {
    const { result } = renderHookWithClient(() => useUpdateTrip());
    await act(async () => {
      await result.current.mutateAsync({
        tripId: "trip_1",
        start_date: "2026-05-01",
        end_date: "2026-05-10",
        unassignPlaceIds: [],
      });
    });

    expect(tripUpdate).toHaveBeenCalledTimes(1);
    expect(placeUpdate).not.toHaveBeenCalled();
  });
});
