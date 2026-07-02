import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  __resetMapsAuthFailedForTest,
  useMapsAuthFailed,
} from "./authFailure";
import { MapFallback } from "./MapFallback";

/**
 * 지도 인증 실패 방어(배포 안정성) — window.gm_authFailure 발동 시 MapFallback(error)로 분기하는지.
 * MapCanvas 도 동일하게 `loadError || authFailed` 로 error fallback 을 렌더한다.
 */
function Probe() {
  return useMapsAuthFailed() ? (
    <MapFallback variant="error" />
  ) : (
    <div>지도 정상</div>
  );
}

afterEach(() => __resetMapsAuthFailedForTest());

describe("useMapsAuthFailed / gm_authFailure", () => {
  it("초기엔 정상, gm_authFailure 발동 시 error fallback 을 렌더한다", () => {
    render(<Probe />);
    expect(screen.getByText("지도 정상")).toBeInTheDocument();

    act(() => {
      window.gm_authFailure?.();
    });

    expect(screen.getByText("지도를 불러오지 못했어요")).toBeInTheDocument();
    expect(screen.queryByText("지도 정상")).toBeNull();
  });
});
