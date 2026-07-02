import { act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderHookWithClient } from "@/test/utils";

import { useUpsertPlace } from "./useUpsertPlace";

/** 10→04~06 무효화 키 일치 — 장소 저장 성공 시 ['places', tripId] 무효화. */
describe("useUpsertPlace", () => {
  it("성공 시 ['places', tripId] 를 무효화한다", async () => {
    const { result, client } = renderHookWithClient(() => useUpsertPlace("trip_1"));
    const spy = vi.spyOn(client, "invalidateQueries");
    await act(async () => {
      await result.current.mutateAsync({
        name: "블루보틀",
        address: "도쿄",
        category: "cafe",
        folderId: "f-cafe",
        memo: "",
      });
    });
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith({ queryKey: ["places", "trip_1"] }),
    );
  });
});
