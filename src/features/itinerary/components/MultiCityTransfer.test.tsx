import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithClient } from "@/test/utils";

import { usePlanStore } from "../store/planStore";
import { useSelectionStore } from "../store/selectionStore";
import { PlanView } from "./PlanView";

/**
 * 도시 간 이동 세그먼트(Phase 5) 통합 — PLAN_FIXTURE(trip_1, 2026-04-18~21)에 도시 2개(도쿄 2박·오사카 1박)를
 * 얹고, 오사카에 도착 이동(신칸센)을 넣어 경계일(4/20=Day3)에 이동 카드가 뜨는지, 경계 아닌 날엔 안 뜨는지,
 * 단일 도시 회귀 0 을 검증. Phase 3 교훈: 배럴 대신 리프(useTripCities)를 mock.
 */
const cityState = vi.hoisted(() => ({
  list: [
    {
      id: "c-tokyo",
      name: "도쿄",
      country: "일본",
      lat: 35.68,
      lng: 139.76,
      nights: 2,
      seq: 0,
      arrival: null,
    },
    {
      id: "c-osaka",
      name: "오사카",
      country: "일본",
      lat: 34.69,
      lng: 135.5,
      nights: 1,
      seq: 1,
      arrival: { mode: "train", name: "신칸센 노조미", time: "09:30", durationMin: 15 },
    },
  ] as Array<Record<string, unknown>>,
}));

vi.mock("@/features/trip/api/useTripCities", () => ({
  useTripCities: () => ({ data: cityState.list }),
}));

beforeEach(() => {
  usePlanStore.setState({
    activeDay: 0,
    filterToday: true,
    activeCategory: "all",
    selectedId: null,
  });
  useSelectionStore.setState({ selectedDate: null });
  cityState.list = [
    { id: "c-tokyo", name: "도쿄", country: "일본", lat: 35.68, lng: 139.76, nights: 2, seq: 0, arrival: null },
    {
      id: "c-osaka",
      name: "오사카",
      country: "일본",
      lat: 34.69,
      lng: 135.5,
      nights: 1,
      seq: 1,
      arrival: { mode: "train", name: "신칸센 노조미", time: "09:30", durationMin: 15 },
    },
  ];
});

describe("PlanView — 도시 간 이동 카드", () => {
  it("도시 경계일(오사카 첫날 Day3)에 이동 카드를 노출한다", async () => {
    usePlanStore.setState({ activeDay: 2 }); // Day3 = 2026-04-20 = 오사카 첫날(경계)
    renderWithClient(<PlanView tripId="trip_1" />);
    await screen.findByText("센소지"); // Day3 로드 확인(fixture)

    expect(screen.getAllByText(/신칸센 노조미/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/약 15분/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("기차").length).toBeGreaterThan(0);
  });

  it("경계가 아닌 날(Day1)에는 이동 카드가 없다", async () => {
    usePlanStore.setState({ activeDay: 0 }); // Day1 = 도쿄 첫날(경계 아님)
    renderWithClient(<PlanView tripId="trip_1" />);
    await screen.findByText("츠키지 장외시장");

    expect(screen.queryByText("신칸센 노조미")).toBeNull();
  });

  it("이동 카드 편집 버튼으로 편집 모달이 열린다", async () => {
    usePlanStore.setState({ activeDay: 2 });
    renderWithClient(<PlanView tripId="trip_1" />);
    await screen.findByText("센소지");

    fireEvent.click(screen.getAllByRole("button", { name: "이동 편집" })[0]);
    // 모달 제목 + 필드
    expect(screen.getByText("도쿄 → 오사카 이동")).toBeInTheDocument();
    expect(screen.getByText("이동 수단")).toBeInTheDocument();
  });
});

describe("PlanView — 단일 도시 회귀 0", () => {
  beforeEach(() => {
    cityState.list = [
      { id: "c-only", name: "도쿄", country: "일본", lat: 35.68, lng: 139.76, nights: 3, seq: 0, arrival: null },
    ];
  });

  it("이동 카드가 전혀 없다", async () => {
    usePlanStore.setState({ activeDay: 2 });
    renderWithClient(<PlanView tripId="trip_1" />);
    await screen.findByText("센소지");

    expect(screen.queryByText("신칸센 노조미")).toBeNull();
    expect(screen.queryAllByRole("button", { name: "이동 편집" })).toHaveLength(0);
  });
});
