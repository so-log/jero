import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { PLAN_FIXTURE } from "../api/fixtures";
import { deriveDays, placesForDay } from "../lib/selectors";
import { usePlanStore } from "../store/planStore";
import { ItineraryPanel } from "./ItineraryPanel";

/** 04 권한 분기 — viewer(canEdit=false)는 편집·추가·드래그 UI 부재(수용 기준 §11). */
const days = deriveDays(
  PLAN_FIXTURE.trip.start_date,
  PLAN_FIXTURE.trip.end_date,
);
const dayPlaces = placesForDay(PLAN_FIXTURE.places, "2026-04-18");

beforeEach(() => {
  usePlanStore.setState({
    activeDay: 0,
    filterToday: true,
    activeCategory: "all",
    selectedId: null,
  });
});

describe("ItineraryPanel 권한 분기", () => {
  it("editor: '장소 추가' 버튼 + 드래그 힌트 노출", () => {
    render(<ItineraryPanel days={days} dayPlaces={dayPlaces} isLoading={false} canEdit />);
    expect(screen.getByRole("button", { name: "장소 추가" })).toBeInTheDocument();
    expect(
      screen.getByText(/드래그해서 순서를 바꾸면/),
    ).toBeInTheDocument();
  });

  it("viewer: 추가 버튼·드래그 힌트 없음, 일정은 읽기 전용으로 표시", () => {
    render(
      <ItineraryPanel days={days} dayPlaces={dayPlaces} isLoading={false} canEdit={false} />,
    );
    expect(screen.queryByRole("button", { name: "장소 추가" })).toBeNull();
    expect(screen.queryByText(/드래그해서 순서를 바꾸면/)).toBeNull();
    // 읽기 전용이어도 일정 항목은 보인다
    expect(screen.getByText("츠키지 장외시장")).toBeInTheDocument();
  });
});

describe("ItineraryPanel 드래그 게이트 canDrag=canEdit && activeCategory==='all'", () => {
  it("editor + '전체': 각 장소에 드래그 핸들(순서 변경)이 있다", () => {
    render(<ItineraryPanel days={days} dayPlaces={dayPlaces} isLoading={false} canEdit />);
    expect(
      screen.getAllByRole("button", { name: /순서 변경/ }),
    ).toHaveLength(dayPlaces.length);
  });

  it("카테고리 필터 중에는 드래그 핸들이 없다(비활성)", () => {
    usePlanStore.setState({ activeCategory: "museum" });
    render(<ItineraryPanel days={days} dayPlaces={dayPlaces} isLoading={false} canEdit />);
    expect(screen.queryByRole("button", { name: /순서 변경/ })).toBeNull();
  });

  it("viewer 는 드래그 핸들이 없다", () => {
    render(
      <ItineraryPanel days={days} dayPlaces={dayPlaces} isLoading={false} canEdit={false} />,
    );
    expect(screen.queryByRole("button", { name: /순서 변경/ })).toBeNull();
  });
});

describe("ItineraryPanel empty/loading (수용 기준 §11)", () => {
  it("empty: 등록 장소 0이면 CTA('장소 추가하기')와 안내가 표시된다", () => {
    render(
      <ItineraryPanel days={days} dayPlaces={[]} isLoading={false} canEdit />,
    );
    expect(screen.getByText("아직 등록된 장소가 없어요")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /장소 추가하기/ }),
    ).toBeInTheDocument();
  });

  it("loading: 좌측 카드 스켈레톤이 표시되고 일정은 아직 없다", () => {
    const { container } = render(
      <ItineraryPanel days={[]} dayPlaces={[]} isLoading canEdit />,
    );
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(
      0,
    );
    expect(screen.queryByText("츠키지 장외시장")).toBeNull();
  });
});
