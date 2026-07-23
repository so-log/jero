import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PlaceDto } from "@/features/itinerary";
import { renderWithClient } from "@/test/utils";

import { usePlacesStore } from "../store/placesStore";
import { ALL_CITIES, ALL_FOLDER } from "../types";
import { PlacesView } from "./PlacesView";

/**
 * 장소 도시 축(Phase 4) 통합 — trip_1(2026-04-18~21)에 도시 2개(도쿄 2박·오사카 1박)를 얹고,
 * city_id 가 실린 저장 장소로 도시 필터/그룹·이동 메뉴가 뜨는지, 단일 도시 회귀 0 을 검증.
 * Phase 3 교훈: 배럴 mock 대신 리프(useTripCities·usePlacesQuery)를 직접 mock 해야 큰 그래프에서 새지 않는다.
 */
const cityState = vi.hoisted(() => ({
  list: [
    { id: "c-tokyo", name: "도쿄", country: "일본", lat: null, lng: null, nights: 2, seq: 0 },
    { id: "c-osaka", name: "오사카", country: "일본", lat: null, lng: null, nights: 1, seq: 1 },
  ] as Array<Record<string, unknown>>,
}));

function saved(id: string, name: string, cityId: string | null): PlaceDto {
  return {
    id,
    name,
    category: "food",
    scheduled_date: null,
    order_in_day: null,
    start_time: null,
    duration_min: null,
    memo: null,
    lat: null,
    lng: null,
    area: "지역",
    saved_by: null,
    folder_id: null,
    city_id: cityId,
  };
}

const RESPONSE = {
  trip: {
    id: "trip_1",
    title: "간사이",
    start_date: "2026-04-18",
    end_date: "2026-04-21",
    my_role: "owner",
    cover_icon: "plane",
  },
  places: [],
  saved_places: [
    saved("p-t1", "츠키지시장", "c-tokyo"),
    saved("p-t2", "시부야스카이", "c-tokyo"),
    saved("p-o1", "도톤보리", "c-osaka"),
    saved("p-none", "미배정장소", null),
  ],
  folders: [],
};

vi.mock("@/features/trip/api/useTripCities", () => ({
  useTripCities: () => ({ data: cityState.list }),
}));
vi.mock("@/features/itinerary/api/usePlacesQuery", () => ({
  usePlacesQuery: () => ({ data: RESPONSE, isLoading: false }),
  useMembersQuery: () => ({ data: [] }),
}));

beforeEach(() => {
  usePlacesStore.setState({
    folderId: ALL_FOLDER,
    cityId: ALL_CITIES,
    selectedId: null,
    query: "",
    sort: "recent",
    assigned: {},
  });
  cityState.list = [
    { id: "c-tokyo", name: "도쿄", country: "일본", lat: null, lng: null, nights: 2, seq: 0 },
    { id: "c-osaka", name: "오사카", country: "일본", lat: null, lng: null, nights: 1, seq: 1 },
  ];
});

describe("PlacesView — 다중 도시 도시 축", () => {
  it("도시 필터 축과 도시별 그룹 섹션을 노출한다", async () => {
    renderWithClient(<PlacesView tripId="trip_1" />);
    await screen.findByText("도톤보리");

    // "도시" 축 라벨(사이드바/모바일)
    expect(screen.getAllByText("도시").length).toBeGreaterThan(0);
    // 도시별 그룹 헤더 + 미배정 그룹
    expect(screen.getByText("도시 미배정")).toBeInTheDocument();
    // 전체(전체 도시)에서 네 장소 모두 보인다
    expect(screen.getByText("츠키지시장")).toBeInTheDocument();
    expect(screen.getByText("시부야스카이")).toBeInTheDocument();
    expect(screen.getByText("미배정장소")).toBeInTheDocument();
  });

  it("도시 선택 시 그 도시 장소만 남는다", async () => {
    renderWithClient(<PlacesView tripId="trip_1" />);
    await screen.findByText("도톤보리");

    // 사이드바 오사카 필터 버튼 클릭(가장 앞 = 데스크톱 사이드바)
    fireEvent.click(screen.getAllByRole("button", { name: /오사카/ })[0]);

    expect(screen.getByText("도톤보리")).toBeInTheDocument();
    expect(screen.queryByText("츠키지시장")).toBeNull();
    expect(screen.queryByText("미배정장소")).toBeNull();
  });

  it("카드에 도시 이동 메뉴가 있고 열린다", async () => {
    renderWithClient(<PlacesView tripId="trip_1" />);
    await screen.findByText("도톤보리");

    const moveButtons = screen.getAllByRole("button", { name: /도시 이동/ });
    expect(moveButtons).toHaveLength(4); // 저장 장소 4개 각각
    fireEvent.click(moveButtons[0]);
    expect(screen.getByText("어느 도시의 장소인가요?")).toBeInTheDocument();
  });
});

describe("PlacesView — 단일 도시 회귀 0", () => {
  beforeEach(() => {
    cityState.list = [
      { id: "c-only", name: "도쿄", country: "일본", lat: null, lng: null, nights: 3, seq: 0 },
    ];
  });

  it("도시 축(필터·그룹·이동)이 전혀 없다", async () => {
    renderWithClient(<PlacesView tripId="trip_1" />);
    await screen.findByText("츠키지시장");

    expect(screen.queryByText("도시")).toBeNull();
    expect(screen.queryByText("도시 미배정")).toBeNull();
    expect(screen.queryAllByRole("button", { name: /도시 이동/ })).toHaveLength(0);
    // 장소·폴더 축은 그대로 동작(회귀 0)
    expect(screen.getByText("도톤보리")).toBeInTheDocument();
  });
});
