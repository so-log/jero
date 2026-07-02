import { waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderHookWithClient } from "@/test/utils";

import { useSharedTripQuery } from "./useSharedTripQuery";

/** 08 공유 — 토큰 유효성 + 공개 스냅샷 민감필드 제외(§8.5). */
describe("useSharedTripQuery", () => {
  it("유효 토큰(demo) → 스냅샷, 멤버는 이니셜·색만(이메일 등 민감필드 제외)", async () => {
    const { result } = renderHookWithClient(() => useSharedTripQuery("demo"));
    await waitFor(() => expect(result.current.data).toBeDefined());
    const data = result.current.data!;
    expect(data.ok).toBe(true);
    if (data.ok) {
      expect(data.snapshot.places.length).toBeGreaterThan(0);
      // §8.5: 멤버 객체는 initial·color 만 — email/role/id 등 노출 금지
      for (const m of data.snapshot.members) {
        expect(Object.keys(m).sort()).toEqual(["color", "initial"]);
      }
    }
  });

  it("만료 토큰 → ok:false(expired)", async () => {
    const { result } = renderHookWithClient(() => useSharedTripQuery("expired"));
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toEqual({ ok: false, reason: "expired" });
  });

  it("알 수 없는 토큰 → ok:false(invalid)", async () => {
    const { result } = renderHookWithClient(() => useSharedTripQuery("zzz-bad"));
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toEqual({ ok: false, reason: "invalid" });
  });
});
