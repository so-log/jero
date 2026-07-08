import { test, expect } from "@playwright/test";

import { bootstrap, hasBackend, signedInClient, teardown, type RtData } from "./realtime/support";

/**
 * 실시간 커서(2차 A) 전송 계약 검증 — private 채널의 broadcast `cursor:move`/`cursor:leave`.
 * 지도 위 렌더는 Google Maps 키(env)가 있어야 가능(키 없으면 MapFallback) — 다른 지도 마커와 동일 제약이라
 * 여기선 useTripRealtime 이 사용하는 채널·이벤트·페이로드 계약을 2계정으로 검증한다(수신·self 필터).
 * (렌더/throttle 은 컴포넌트·유닛 테스트로 커버.)
 */
const RUN = Date.now().toString(36);
let data: RtData;

test.describe("실시간 커서 전송(2차 A)", () => {
  test.skip(!hasBackend, ".env.local 키 필요");
  test.beforeAll(async () => {
    data = await bootstrap(`cursor-${RUN}`);
  });
  test.afterAll(async () => {
    if (data) await teardown(data);
  });

  test("A 의 cursor:move/leave 를 B 가 수신한다(같은 private 채널)", async () => {
    const { client: cb } = await signedInClient(data.b);
    const { client: ca } = await signedInClient(data.a);

    const moves: { userId: string; lat: number; lng: number }[] = [];
    let left = "";
    const ch = cb.channel(`trip:${data.tripId}`, { config: { private: true } });
    ch.on("broadcast", { event: "cursor:move" }, (m: { payload?: unknown }) => {
      const p = m.payload as { userId: string; lat: number; lng: number };
      moves.push(p);
    });
    ch.on("broadcast", { event: "cursor:leave" }, (m: { payload?: unknown }) => {
      left = (m.payload as { userId: string }).userId;
    });
    await new Promise<void>((res) => {
      ch.subscribe((s: string) => {
        if (s === "SUBSCRIBED") res();
      });
    });

    // A 채널에서 cursor:move 송신(useTripRealtime transport 와 동일 형태).
    const chA = ca.channel(`trip:${data.tripId}`, { config: { private: true } });
    await new Promise<void>((res) => {
      chA.subscribe((s: string) => {
        if (s === "SUBSCRIBED") res();
      });
    });
    await chA.send({
      type: "broadcast",
      event: "cursor:move",
      payload: { userId: data.a.id, lat: 35.66, lng: 139.7, ts: Date.now() },
    });
    await chA.send({
      type: "broadcast",
      event: "cursor:leave",
      payload: { userId: data.a.id },
    });
    await new Promise((r) => setTimeout(r, 3000));

    expect(moves.some((m) => m.userId === data.a.id && m.lat === 35.66)).toBe(true);
    expect(left).toBe(data.a.id);

    await ca.removeChannel(chA);
    await cb.removeChannel(ch);
    await ca.auth.signOut();
    await cb.auth.signOut();
  });
});
