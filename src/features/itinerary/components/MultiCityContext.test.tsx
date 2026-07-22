import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithClient } from "@/test/utils";

import { usePlanStore } from "../store/planStore";
import { useCalendarStore } from "../store/calendarStore";
import { useSelectionStore } from "../store/selectionStore";
import { CalendarView } from "./CalendarView";
import { PlanView } from "./PlanView";

/**
 * 다중 도시 컨텍스트(Phase 3) 통합 — PLAN_FIXTURE(trip_1, 2026-04-18~21)에 도시 2개(도쿄 2박·오사카 1박)를
 * 얹어 도시 탭·배지·구간 색이 뜨는지, 도시 전환이 Day 로 반영되는지 검증. 단일 도시 회귀는 별도 파일이 커버.
 */
// vi.hoisted: mock 팩토리가 hoist 되므로 도시 데이터도 함께 hoist 해야 참조 가능.
const { MULTI_CITIES } = vi.hoisted(() => ({
  MULTI_CITIES: [
    { id: "c-tokyo", name: "도쿄", country: "일본", lat: 35.68, lng: 139.76, nights: 2, seq: 0 },
    { id: "c-osaka", name: "오사카", country: "일본", lat: 34.69, lng: 135.5, nights: 1, seq: 1 },
  ],
}));

// useTripCities 만 다중 도시로 대체. 배럴(@/features/trip)을 통째로 mock 하면 PlanView 의 큰
// import 그래프에서 배럴이 이중 로드돼(mock/실물) useCitySchedule 내부 바인딩이 실물로 새는 일이
// 있어, 리프 모듈을 직접 mock 한다 — 배럴 re-export 가 이 리프를 가리키므로 전 그래프에 일관 적용된다.
vi.mock("@/features/trip/api/useTripCities", () => ({
  useTripCities: () => ({ data: MULTI_CITIES }),
}));

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

describe("PlanView — 다중 도시", () => {
  it("도시 탭과 현재 도시 시작일 배지를 노출한다", async () => {
    renderWithClient(<PlanView tripId="trip_1" />);
    await screen.findByText("츠키지 장외시장"); // Day1 로드

    expect(screen.getAllByRole("tab", { name: /도쿄/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("tab", { name: /오사카/ }).length).toBeGreaterThan(0);
    // Day1(4/18) = 도쿄 첫날
    expect(screen.getAllByText(/도쿄 첫날/).length).toBeGreaterThan(0);
  });

  it("도시 탭 클릭 시 그 도시 첫날로 이동한다", async () => {
    renderWithClient(<PlanView tripId="trip_1" />);
    await screen.findByText("츠키지 장외시장");

    fireEvent.click(screen.getAllByRole("tab", { name: /오사카/ })[0]);

    // 오사카 첫날 = 4/20(Day3) → 그 날 일정(센소지)로 갱신
    expect(await screen.findByText("센소지")).toBeInTheDocument();
    expect(screen.queryByText("츠키지 장외시장")).toBeNull();
    await waitFor(() =>
      expect(screen.getAllByText(/오사카 첫날/).length).toBeGreaterThan(0),
    );
  });
});

describe("CalendarView — 다중 도시", () => {
  it("도시 범례(색·라벨)를 노출한다", async () => {
    renderWithClient(<CalendarView tripId="trip_1" />);
    await waitFor(() =>
      expect(screen.getAllByText("도쿄").length).toBeGreaterThan(0),
    );
    // 범례 + 월 그리드 도시 시작일 배지에 도시명이 여러 번 등장.
    expect(screen.getAllByText("오사카").length).toBeGreaterThan(0);
  });
});
