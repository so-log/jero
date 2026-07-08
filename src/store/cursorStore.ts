import { create } from "zustand";

/**
 * 실시간 커서(2차 A) 클라 상태 — 워크스페이스(useTripRealtime 송수신)와 지도 뷰(PlanView 렌더)가
 * 공유하므로 도메인 중립 전역 스토어에 둔다(역참조 회피, overlayStore 와 동일 위치).
 * 서버상태 아님(브로드캐스트 비영속) → Zustand. 좌표는 지도 좌표계(lat/lng).
 */
export interface CursorPeer {
  lat: number;
  lng: number;
  /** 마지막 수신 시각(ms) — TTL 만료 판정. */
  ts: number;
}

interface CursorState {
  /** 피어(userId → 최신 좌표). 본인은 제외되어 들어온다. */
  peers: Record<string, CursorPeer>;
  /** 로컬 커서 송신 transport — useTripRealtime 가 채널 구독 시 등록. */
  send: ((lat: number, lng: number) => void) | null;
  leave: (() => void) | null;
  setPeer: (userId: string, lat: number, lng: number, ts: number) => void;
  removePeer: (userId: string) => void;
  /** now - ts > ttlMs 인 피어 제거. */
  prune: (ttlMs: number, now: number) => void;
  setTransport: (
    send: (lat: number, lng: number) => void,
    leave: () => void,
  ) => void;
  /** 채널 정리 시 초기화(피어·transport). */
  reset: () => void;
}

export const useCursorStore = create<CursorState>((set) => ({
  peers: {},
  send: null,
  leave: null,
  setPeer: (userId, lat, lng, ts) =>
    set((s) => ({ peers: { ...s.peers, [userId]: { lat, lng, ts } } })),
  removePeer: (userId) =>
    set((s) => {
      if (!(userId in s.peers)) return s;
      const next = { ...s.peers };
      delete next[userId];
      return { peers: next };
    }),
  prune: (ttlMs, now) =>
    set((s) => {
      let changed = false;
      const next: Record<string, CursorPeer> = {};
      for (const [id, p] of Object.entries(s.peers)) {
        if (now - p.ts <= ttlMs) next[id] = p;
        else changed = true;
      }
      return changed ? { peers: next } : s;
    }),
  setTransport: (send, leave) => set({ send, leave }),
  reset: () => set({ peers: {}, send: null, leave: null }),
}));
