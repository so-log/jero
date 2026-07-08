import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCursorStore } from "./cursorStore";

describe("cursorStore", () => {
  beforeEach(() => useCursorStore.getState().reset());

  it("setPeer/removePeer 로 피어 좌표를 관리한다", () => {
    useCursorStore.getState().setPeer("u1", 35.6, 139.7, 1000);
    expect(useCursorStore.getState().peers.u1).toEqual({ lat: 35.6, lng: 139.7, ts: 1000 });
    useCursorStore.getState().removePeer("u1");
    expect(useCursorStore.getState().peers.u1).toBeUndefined();
  });

  it("prune 는 TTL 초과 피어만 제거한다", () => {
    const s = useCursorStore.getState();
    s.setPeer("stale", 1, 1, 0);
    s.setPeer("fresh", 2, 2, 4000);
    useCursorStore.getState().prune(5000, 5001); // stale: 5001-0>5000 제거, fresh: 5001-4000<=5000 유지
    const peers = useCursorStore.getState().peers;
    expect(peers.stale).toBeUndefined();
    expect(peers.fresh).toBeDefined();
  });

  it("setTransport/reset 로 송신 콜백을 등록·정리한다", () => {
    const send = vi.fn();
    const leave = vi.fn();
    useCursorStore.getState().setTransport(send, leave);
    useCursorStore.getState().send?.(1, 2);
    expect(send).toHaveBeenCalledWith(1, 2);
    useCursorStore.getState().reset();
    expect(useCursorStore.getState().send).toBeNull();
    expect(useCursorStore.getState().peers).toEqual({});
  });
});
