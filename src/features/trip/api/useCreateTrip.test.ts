import { act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderHookWithClient } from "@/test/utils";

import type { CreateTripInput } from "../lib/tripSchema";

// create_trip RPC 호출 인자를 포착하는 스텁(실 Supabase 대신).
const state = vi.hoisted(() => ({
  rpc: null as { name: string; args: unknown } | null,
}));
vi.mock("@/lib/supabase/env", () => ({ hasSupabase: true }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    rpc: (name: string, args: unknown) => {
      state.rpc = { name, args };
      return Promise.resolve({ data: "new-trip-uuid", error: null });
    },
  }),
}));

import { useCreateTrip } from "./useCreateTrip";

const templateInput: CreateTripInput = {
  title: "도쿄 여행",
  icon: "building",
  cover: "blue",
  country: "일본",
  region: "도쿄",
  start_date: "2026-08-01",
  end_date: "2026-08-04",
  members: [],
  startMode: "template",
  templateId: "tpl-tokyo",
};

describe("useCreateTrip (템플릿 복제 배선)", () => {
  it("create_trip payload 에 templateId·startMode 를 전달한다", async () => {
    const { result } = renderHookWithClient(() => useCreateTrip());
    await act(async () => {
      await result.current.mutateAsync(templateInput);
    });
    const args = state.rpc?.args as { payload: Record<string, unknown> };
    expect(state.rpc?.name).toBe("create_trip");
    expect(args.payload.startMode).toBe("template");
    expect(args.payload.templateId).toBe("tpl-tokyo");
  });

  it("성공 시 ['trips'] 와 ['places', newId] 를 무효화한다", async () => {
    const { result, client } = renderHookWithClient(() => useCreateTrip());
    const spy = vi.spyOn(client, "invalidateQueries");
    await act(async () => {
      await result.current.mutateAsync(templateInput);
    });
    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({ queryKey: ["trips"] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["places", "new-trip-uuid"] });
    });
  });
});
