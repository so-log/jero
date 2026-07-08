import { act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PlaceDto, PlacesResponse } from "@/features/itinerary";
import { renderHookWithClient } from "@/test/utils";

// 실패 토글 가능한 Supabase 스텁 — 낙관/롤백 양쪽 검증.
const state = vi.hoisted(() => ({ fail: false }));
vi.mock("@/lib/supabase/env", () => ({ hasSupabase: true }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => {
    const res = () =>
      Promise.resolve({ error: state.fail ? { message: "x" } : null });
    return {
      from: () => ({
        insert: res,
        update: () => ({ eq: res }),
        delete: () => ({ eq: res }),
      }),
    };
  },
}));

import { useDeleteFolder, useUpsertFolder } from "./useFolders";

const TID = "trip_1";
const KEY = ["places", TID];

function place(id: string, folder_id: string | null): PlaceDto {
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
    folder_id,
  };
}

function base(): PlacesResponse {
  return {
    trip: {
      id: TID,
      title: "T",
      start_date: "2026-08-01",
      end_date: "2026-08-02",
      my_role: "owner",
      cover_icon: "plane",
    },
    places: [],
    saved_places: [place("p1", "f1"), place("p2", null)],
    folders: [{ id: "f1", name: "맛집", icon: "bookmark", color: "#3B7DF0" }],
  };
}

describe("useUpsertFolder (낙관적)", () => {
  it("생성: folders 에 새 폴더를 낙관적으로 추가", async () => {
    state.fail = false;
    const { client, result } = renderHookWithClient(() => useUpsertFolder(TID));
    client.setQueryData(KEY, base());
    await act(async () => {
      await result.current.mutateAsync({ name: "카페" });
    });
    const after = client.getQueryData<PlacesResponse>(KEY);
    expect(after?.folders.map((f) => f.name)).toContain("카페");
  });

  it("이름변경: 해당 폴더 name 만 갱신", async () => {
    state.fail = false;
    const { client, result } = renderHookWithClient(() => useUpsertFolder(TID));
    client.setQueryData(KEY, base());
    await act(async () => {
      await result.current.mutateAsync({ id: "f1", name: "맛집(수정)" });
    });
    const after = client.getQueryData<PlacesResponse>(KEY);
    expect(after?.folders.find((f) => f.id === "f1")?.name).toBe("맛집(수정)");
  });

  it("실패 시 이전 상태로 롤백", async () => {
    state.fail = true;
    const { client, result } = renderHookWithClient(() => useUpsertFolder(TID));
    client.setQueryData(KEY, base());
    await act(async () => {
      await result.current.mutateAsync({ name: "실패폴더" }).catch(() => {});
    });
    const after = client.getQueryData<PlacesResponse>(KEY);
    expect(after?.folders.map((f) => f.name)).not.toContain("실패폴더");
    expect(after?.folders).toHaveLength(1);
  });
});

describe("useDeleteFolder (낙관적)", () => {
  it("삭제: 폴더 제거 + 소속 장소 folder_id=null(미분류)", async () => {
    state.fail = false;
    const { client, result } = renderHookWithClient(() => useDeleteFolder(TID));
    client.setQueryData(KEY, base());
    await act(async () => {
      await result.current.mutateAsync("f1");
    });
    const after = client.getQueryData<PlacesResponse>(KEY);
    expect(after?.folders).toHaveLength(0);
    expect(after?.saved_places.find((p) => p.id === "p1")?.folder_id).toBeNull();
  });

  it("실패 시 롤백(폴더·장소 복구)", async () => {
    state.fail = true;
    const { client, result } = renderHookWithClient(() => useDeleteFolder(TID));
    client.setQueryData(KEY, base());
    await act(async () => {
      await result.current.mutateAsync("f1").catch(() => {});
    });
    const after = client.getQueryData<PlacesResponse>(KEY);
    expect(after?.folders).toHaveLength(1);
    expect(after?.saved_places.find((p) => p.id === "p1")?.folder_id).toBe("f1");
  });
});
