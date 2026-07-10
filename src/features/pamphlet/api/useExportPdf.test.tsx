import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PamphletSections } from "../lib/faces";
import { useExportPdf } from "./useExportPdf";

// 의존성 모킹: 토큰 발급(mutateAsync)·스토어(shareToken 존재로 발급 스킵).
const mutateAsync = vi.fn(async () => "new-token");
vi.mock("@/features/workspace/api/useShareActions", () => ({
  useShareActions: () => ({ issueShareLink: { mutateAsync } }),
}));
vi.mock("../store/pamphletStore", () => ({
  usePamphletStore: (sel: (s: unknown) => unknown) =>
    sel({
      shareToken: "tok-1",
      setShareToken: vi.fn(),
      prep: [{ label: "여권", on: true }],
    }),
}));

const SECTIONS: PamphletSections = {
  cover: true,
  schedule: true,
  prep: false,
  intro: false,
  qr: true,
};

describe("useExportPdf", () => {
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("open", vi.fn());
    // jsdom 미구현 API 스텁.
    URL.createObjectURL = vi.fn(() => "blob:mock");
    URL.revokeObjectURL = vi.fn();
    clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    clickSpy.mockRestore();
    mutateAsync.mockClear();
  });

  it("서버 PDF 성공 시 blob 을 다운로드하고 print 폴백을 열지 않는다", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      blob: async () => new Blob(["%PDF"], { type: "application/pdf" }),
    });

    const { result } = renderHook(() => useExportPdf("trip_2"));
    await act(async () => {
      await result.current.exportPdf("beach", SECTIONS);
    });

    // 올바른 엔드포인트·바디로 서버 호출.
    expect(fetch).toHaveBeenCalledWith(
      "/api/pamphlet/export",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          tripId: "trip_2",
          theme: "beach",
          sections: "cover,schedule,qr",
          token: "tok-1",
          prep: JSON.stringify([{ label: "여권", on: true }]),
        }),
      }),
    );
    // 다운로드(anchor click) 발생, print 새 탭은 열지 않음.
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(window.open).not.toHaveBeenCalled();
  });

  it("서버 렌더 실패(비 200) 시 print 라우트로 그레이스풀 폴백한다", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      blob: async () => new Blob([]),
    });

    const { result } = renderHook(() => useExportPdf("trip_2"));
    await act(async () => {
      await result.current.exportPdf("beach", SECTIONS);
    });

    expect(window.open).toHaveBeenCalledTimes(1);
    const url = (window.open as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(url).toContain("/trips/trip_2/pamphlet/print?");
    expect(url).toContain("theme=beach");
    expect(url).toContain("token=tok-1");
    expect(clickSpy).not.toHaveBeenCalled();
  });
});
