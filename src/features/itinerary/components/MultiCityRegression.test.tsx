import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { renderWithClient } from "@/test/utils";

import { usePlanStore } from "../store/planStore";
import { useCalendarStore } from "../store/calendarStore";
import { useSelectionStore } from "../store/selectionStore";
import { CalendarView } from "./CalendarView";
import { PlanView } from "./PlanView";

/**
 * 단일 도시 회귀 0(Phase 3) — 도시 데이터가 없으면(useTripCities=[], 키 없음) 도시 UI 가 전혀 뜨지 않고
 * 기존 동작 그대로여야 한다. 이 파일은 useTripCities 를 mock 하지 않는다(실제 → 빈 배열).
 */
beforeEach(() => {
  usePlanStore.setState({
    activeDay: 0,
    filterToday: true,
    activeCategory: "all",
    selectedId: null,
  });
  useCalendarStore.setState({ mode: "month", cursorDate: null });
  useSelectionStore.setState({ selectedDate: null });
});

describe("단일 도시 회귀", () => {
  it("PlanView: 도시 탭·배지가 없다", async () => {
    renderWithClient(<PlanView tripId="trip_1" />);
    await screen.findByText("츠키지 장외시장");
    expect(screen.queryByRole("tablist", { name: "도시 전환" })).toBeNull();
    expect(screen.queryByText(/첫날/)).toBeNull();
  });

  it("CalendarView: 도시 범례가 없다", async () => {
    renderWithClient(<CalendarView tripId="trip_1" />);
    await waitFor(() =>
      expect(screen.getByText("2026년 4월")).toBeInTheDocument(),
    );
    // 오사카는 fixture 에 없는 도시명 — 도시 UI 미노출이면 등장하지 않는다.
    expect(screen.queryByText("오사카")).toBeNull();
  });
});
