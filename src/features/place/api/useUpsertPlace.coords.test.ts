import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderHookWithClient } from "@/test/utils";

import { placeSchema } from "../lib/placeSchema";
import { useUpsertPlace } from "./useUpsertPlace";

// hasSupabase=true 경로에서 insert row 에 좌표·place_id 가 실린다.
vi.mock("@/lib/supabase/env", () => ({ hasSupabase: true }));

const insertSpy = vi.fn<(row: Record<string, unknown>) => { error: null }>(
  () => ({ error: null }),
);
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
    from: () => ({
      insert: insertSpy,
      update: () => ({ eq: () => ({ error: null }) }),
    }),
  }),
}));

describe("useUpsertPlace — 좌표·place_id 기록", () => {
  beforeEach(() => insertSpy.mockClear());

  it("신규 저장 시 lat·lng·google_place_id 를 place 에 기록한다", async () => {
    const { result } = renderHookWithClient(() => useUpsertPlace("trip_1"));
    await act(async () => {
      await result.current.mutateAsync({
        name: "센소지",
        address: "도쿄도 다이토구",
        category: "museum",
        folderId: null,
        memo: "",
        lat: 35.7148,
        lng: 139.7967,
        googlePlaceId: "ChIJ8T1GpMGOGGAR",
      });
    });
    expect(insertSpy).toHaveBeenCalledTimes(1);
    expect(insertSpy.mock.calls[0][0]).toMatchObject({
      name: "센소지",
      trip_id: "trip_1",
      saved_by: "u1",
      lat: 35.7148,
      lng: 139.7967,
      google_place_id: "ChIJ8T1GpMGOGGAR",
    });
  });

  it("좌표 없는 수기 입력은 lat·lng·google_place_id 를 null 로 기록(마커 없음)", async () => {
    const { result } = renderHookWithClient(() => useUpsertPlace("trip_1"));
    await act(async () => {
      await result.current.mutateAsync({
        name: "이름만 장소",
        address: "",
        category: "etc",
        folderId: null,
        memo: "",
      });
    });
    expect(insertSpy.mock.calls[0][0]).toMatchObject({
      lat: null,
      lng: null,
      google_place_id: null,
      // 일반(장소 탭) 추가는 미배정 유지.
      scheduled_date: null,
      order_in_day: null,
    });
  });

  it("Day 맥락 추가(scheduledDate)는 그 날짜에 배정하며 생성한다(B6)", async () => {
    const { result } = renderHookWithClient(() => useUpsertPlace("trip_1"));
    await act(async () => {
      await result.current.mutateAsync({
        name: "에펠탑",
        address: "파리",
        category: "museum",
        folderId: null,
        memo: "",
        scheduledDate: "2026-08-11",
      });
    });
    expect(insertSpy.mock.calls[0][0]).toMatchObject({
      scheduled_date: "2026-08-11",
      order_in_day: 1, // 캐시 비어있음 → 그 날 첫 순서
      scheduled_by: "u1",
    });
  });
});

describe("placeSchema — 좌표 선택 필드", () => {
  it("좌표 없이도 통과하고, 좌표가 있으면 보존한다", () => {
    expect(
      placeSchema.safeParse({
        name: "카페",
        address: "",
        category: "cafe",
        folderId: null,
        memo: "",
      }).success,
    ).toBe(true);

    const parsed = placeSchema.parse({
      name: "카페",
      address: "서울",
      category: "cafe",
      folderId: null,
      memo: "",
      lat: 37.5,
      lng: 127.0,
      googlePlaceId: "abc",
    });
    expect(parsed.lat).toBe(37.5);
    expect(parsed.googlePlaceId).toBe("abc");
  });
});
