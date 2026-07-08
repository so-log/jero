import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { usePlacesQuery } from "@/features/itinerary";
import type { PlaceDto, PlacesResponse } from "@/features/itinerary";

import { StatsView } from "./StatsView";

// usePlacesQuery 만 목(딴 export 는 실제 — computeTripStats 가 deriveDays 를 씀).
vi.mock("@/features/itinerary", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/itinerary")>();
  return { ...actual, usePlacesQuery: vi.fn() };
});
const mockUse = vi.mocked(usePlacesQuery);

function scheduled(id: string, extra: Partial<PlaceDto>): PlaceDto {
  return {
    id,
    name: id,
    category: "museum",
    scheduled_date: "2026-08-01",
    order_in_day: 1,
    start_time: null,
    duration_min: null,
    memo: null,
    lat: null,
    lng: null,
    ...extra,
  };
}

function resp(places: PlaceDto[]): PlacesResponse {
  return {
    trip: {
      id: "t",
      title: "T",
      start_date: "2026-08-01",
      end_date: "2026-08-02",
      my_role: "viewer",
      cover_icon: "plane",
    },
    places,
    saved_places: [],
    folders: [],
  };
}

function setData(data: PlacesResponse | undefined, isLoading = false) {
  mockUse.mockReturnValue({ data, isLoading } as unknown as ReturnType<
    typeof usePlacesQuery
  >);
}

describe("StatsView (2차 E)", () => {
  it("일정 있으면 요약 카드 + 차트가 렌더된다", () => {
    setData(
      resp([
        scheduled("a", { order_in_day: 1, lat: 35.0, lng: 139.0, category: "food" }),
        scheduled("b", { order_in_day: 2, lat: 35.1, lng: 139.0, category: "cafe" }),
      ]),
    );
    render(<StatsView tripId="t" />);
    expect(screen.getByText("총 이동거리")).toBeInTheDocument();
    expect(screen.getByText("일자별 이동거리")).toBeInTheDocument();
    expect(screen.getByText("카테고리별 장소")).toBeInTheDocument();
    // viewer 도 열람(편집 없음) — 카드 렌더.
    expect(screen.getByText("여행 일수")).toBeInTheDocument();
  });

  it("일정 0 이면 빈 상태 안내", () => {
    setData(resp([]));
    render(<StatsView tripId="t" />);
    expect(screen.getByText("아직 통계가 없어요")).toBeInTheDocument();
    expect(screen.queryByText("총 이동거리")).toBeNull();
  });

  it("로딩 중 스켈레톤", () => {
    setData(undefined, true);
    const { container } = render(<StatsView tripId="t" />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });
});
