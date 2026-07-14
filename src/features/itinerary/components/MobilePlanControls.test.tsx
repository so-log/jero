import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Day } from "../types";
import { MobilePlanControls } from "./MobilePlanControls";

/**
 * 반응형 3-B 모바일 플랜 컨트롤 — Day 스위처(화살표) + 리스트/지도 세그먼트. 순수 표현(데이터 없음).
 */
const DAYS: Day[] = [
  { index: 0, date: "2026-04-18", label: "Day 1", weekday: "금" },
  { index: 1, date: "2026-04-19", label: "Day 2", weekday: "토" },
  { index: 2, date: "2026-04-20", label: "Day 3", weekday: "일" },
];

describe("MobilePlanControls", () => {
  it("현재 Day 라벨·날짜와 리스트/지도 세그먼트가 보인다", () => {
    render(
      <MobilePlanControls
        days={DAYS}
        activeDay={0}
        onDayChange={vi.fn()}
        mode="list"
        onModeChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Day 1")).toBeInTheDocument();
    expect(screen.getByText("4월 18일 · 금요일")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "리스트" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "지도" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("지도 세그먼트 클릭 시 onModeChange('map')", () => {
    const onModeChange = vi.fn();
    render(
      <MobilePlanControls
        days={DAYS}
        activeDay={0}
        onDayChange={vi.fn()}
        mode="list"
        onModeChange={onModeChange}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "지도" }));
    expect(onModeChange).toHaveBeenCalledWith("map");
  });

  it("다음 날짜 화살표는 activeDay+1, 첫 날에는 이전 화살표 비활성", () => {
    const onDayChange = vi.fn();
    render(
      <MobilePlanControls
        days={DAYS}
        activeDay={0}
        onDayChange={onDayChange}
        mode="list"
        onModeChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "이전 날짜" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "다음 날짜" }));
    expect(onDayChange).toHaveBeenCalledWith(1);
  });

  it("마지막 날에는 다음 화살표 비활성", () => {
    render(
      <MobilePlanControls
        days={DAYS}
        activeDay={2}
        onDayChange={vi.fn()}
        mode="map"
        onModeChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "다음 날짜" })).toBeDisabled();
  });
});
