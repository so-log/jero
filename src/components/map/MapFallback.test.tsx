import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MapFallback } from "./MapFallback";

/**
 * 지도 자리표시 — 로딩/키없음/실패 시 레이아웃을 보존한다(수용 기준 §11: 지도 로딩 오버레이).
 */
describe("MapFallback", () => {
  it("loading: 스피너 + '지도를 불러오는 중…' 오버레이", () => {
    const { container } = render(<MapFallback variant="loading" />);
    expect(screen.getByText("지도를 불러오는 중…")).toBeInTheDocument();
    expect(container.querySelector(".animate-spin")).not.toBeNull();
  });

  it("no-key: 키 미설정 안내를 표시한다", () => {
    render(<MapFallback variant="no-key" />);
    expect(screen.getByText("지도 키가 설정되지 않았어요")).toBeInTheDocument();
  });
});
