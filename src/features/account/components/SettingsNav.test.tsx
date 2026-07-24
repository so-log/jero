import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SettingsNav } from "./SettingsNav";

describe("SettingsNav — 마지막 로그인(감사 B)", () => {
  it("실값 있으면 '마지막 로그인' 표기", () => {
    render(
      <SettingsNav active="profile" onSelect={vi.fn()} lastLogin="2026.6.23 오전 9:12" />,
    );
    // 텍스트가 <br/> 로 나뉘어 한 요소에 담겨 regex 로 조회.
    expect(screen.getByText(/마지막 로그인/)).toBeInTheDocument();
    expect(screen.getByText(/2026\.6\.23 오전 9:12/)).toBeInTheDocument();
  });

  it("값 없으면 표기 숨김(고정값·버전 제거)", () => {
    render(<SettingsNav active="profile" onSelect={vi.fn()} />);
    expect(screen.queryByText(/마지막 로그인/)).toBeNull();
    // 예전 하드코딩 버전 표기가 없어야 한다.
    expect(screen.queryByText(/v2\.4/)).toBeNull();
  });
});
