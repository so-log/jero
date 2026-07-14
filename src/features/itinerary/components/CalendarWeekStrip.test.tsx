import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PlaceDto } from "../types";
import { CalendarWeekStrip } from "./CalendarWeekStrip";

/**
 * 반응형 3-C 7일 스트립 — 셀 렌더·선택 강조·일정 선택 위임(순수 표현).
 */
const DAYS = [
  "2026-04-12",
  "2026-04-13",
  "2026-04-14",
  "2026-04-15",
  "2026-04-16",
  "2026-04-17",
  "2026-04-18",
];

const byDate = new Map<string, PlaceDto[]>([
  ["2026-04-18", [{ id: "d1a", category: "food" } as PlaceDto]],
]);

describe("CalendarWeekStrip", () => {
  it("7일 셀을 렌더하고 선택일에 aria-pressed=true", () => {
    render(
      <CalendarWeekStrip
        days={DAYS}
        selected="2026-04-18"
        byDate={byDate}
        tripStart="2026-04-18"
        tripEnd="2026-04-21"
        onSelect={vi.fn()}
      />,
    );
    const cells = screen.getAllByRole("button");
    expect(cells).toHaveLength(7);
    const sel = screen.getByRole("button", { name: "18일 토요일" });
    expect(sel).toHaveAttribute("aria-pressed", "true");
  });

  it("셀 클릭 시 그 날짜로 onSelect", () => {
    const onSelect = vi.fn();
    render(
      <CalendarWeekStrip
        days={DAYS}
        selected="2026-04-18"
        byDate={byDate}
        tripStart="2026-04-18"
        tripEnd="2026-04-21"
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "15일 수요일" }));
    expect(onSelect).toHaveBeenCalledWith("2026-04-15");
  });
});
