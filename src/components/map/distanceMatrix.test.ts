import { describe, expect, it } from "vitest";

import { fetchTravelTimeMatrix } from "./distanceMatrix";

/** 실이동시간 래퍼 — google 미로드/입력 부족 시 null(호출측 Haversine 폴백). */
describe("fetchTravelTimeMatrix", () => {
  it("google 미로드(테스트 환경)면 null 반환(크래시 없음)", async () => {
    // jsdom 에는 google 전역이 없음 → 폴백 신호 null.
    expect(typeof (globalThis as { google?: unknown }).google).toBe(
      "undefined",
    );
    await expect(
      fetchTravelTimeMatrix([
        { lat: 0, lng: 0 },
        { lat: 1, lng: 1 },
      ]),
    ).resolves.toBeNull();
  });

  it("좌표 2곳 미만이면 null", async () => {
    await expect(fetchTravelTimeMatrix([{ lat: 0, lng: 0 }])).resolves.toBeNull();
    await expect(fetchTravelTimeMatrix([])).resolves.toBeNull();
  });
});
