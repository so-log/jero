import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { renderWithClient } from "@/test/utils";

import { usePlanStore } from "../store/planStore";
import { useSelectionStore } from "../store/selectionStore";
import { PlanView } from "./PlanView";

/**
 * 04 플랜 뷰 통합 — 데이터 응답→화면 렌더(수용 기준 §11). 지도 키 없음 → 지도는 fallback(키 동선은 별도 항목).
 */
beforeEach(() => {
  usePlanStore.setState({
    activeDay: 0,
    filterToday: true,
    activeCategory: "all",
    selectedId: null,
  });
  // 플랜↔캘린더 공유 선택 날짜(B5) — 테스트 간 격리(싱글턴 store leak 방지).
  useSelectionStore.setState({ selectedDate: null });
});

describe("PlanView", () => {
  it("진입 시 Day1 일정 리스트가 렌더된다", async () => {
    renderWithClient(<PlanView tripId="trip_1" />);
    expect(await screen.findByText("츠키지 장외시장")).toBeInTheDocument();
    expect(screen.getByText("긴자 식스")).toBeInTheDocument();
  });

  it("날짜 전환 시 해당 날 일정으로 갱신된다", async () => {
    renderWithClient(<PlanView tripId="trip_1" />);
    await screen.findByText("츠키지 장외시장");
    fireEvent.click(screen.getByRole("button", { name: /Day 2/ }));
    expect(await screen.findByText("시부야 스크램블")).toBeInTheDocument();
    expect(screen.queryByText("츠키지 장외시장")).toBeNull();
  });

  it("장소 카드 선택 시 양방향 하이라이트(aria-pressed)", async () => {
    renderWithClient(<PlanView tripId="trip_1" />);
    await screen.findByText("긴자 식스");
    const card = screen.getByRole("button", { name: /긴자 식스/ });
    fireEvent.click(card);
    await waitFor(() => expect(card).toHaveAttribute("aria-pressed", "true"));
    expect(usePlanStore.getState().selectedId).toBe("d1c");
  });
});
