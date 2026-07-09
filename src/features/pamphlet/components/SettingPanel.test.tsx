import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { DEFAULT_PREP } from "../lib/prep";
import { usePamphletStore } from "../store/pamphletStore";
import { SettingPanel } from "./SettingPanel";

beforeEach(() => {
  usePamphletStore.setState({
    sections: { cover: true, schedule: true, prep: true, intro: true, qr: true },
    themeKey: "beach",
    prep: DEFAULT_PREP.map((p) => ({ ...p })),
    shareToken: null,
  });
});

describe("SettingPanel (팜플렛 설정)", () => {
  it("섹션 토글: '일정표' 클릭 → store.sections.schedule 반전", () => {
    render(<SettingPanel scheduleDisabled={false} />);
    fireEvent.click(screen.getByRole("button", { name: /일정표/ }));
    expect(usePamphletStore.getState().sections.schedule).toBe(false);
  });

  it("테마 변경: 칩 클릭 → store.themeKey 갱신", () => {
    render(<SettingPanel scheduleDisabled={false} />);
    fireEvent.click(screen.getByRole("button", { name: /숲/ }));
    expect(usePamphletStore.getState().themeKey).toBe("forest");
  });

  it("scheduleDisabled: 일정표 섹션 비활성 + '일정 없음' 표기", () => {
    render(<SettingPanel scheduleDisabled />);
    const btn = screen.getByRole("button", { name: /일정표/ });
    expect(btn).toBeDisabled();
    expect(screen.getByText(/일정 없음/)).toBeInTheDocument();
  });

  it("준비물 추가: 입력 후 Enter → store.prep 에 항목 추가", () => {
    render(<SettingPanel scheduleDisabled={false} />);
    const before = usePamphletStore.getState().prep.length;
    fireEvent.click(screen.getByRole("button", { name: "항목 추가" }));
    const input = screen.getByPlaceholderText("준비물 이름");
    fireEvent.change(input, { target: { value: "카메라" } });
    fireEvent.keyDown(input, { key: "Enter" });
    const prep = usePamphletStore.getState().prep;
    expect(prep.length).toBe(before + 1);
    expect(prep.at(-1)).toEqual({ label: "카메라", on: true });
  });
});
