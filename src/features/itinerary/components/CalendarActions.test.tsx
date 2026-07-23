import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useOverlayStore } from "@/store/overlayStore";
import { renderWithClient } from "@/test/utils";

import { useCalendarStore } from "../store/calendarStore";
import { useSelectionStore } from "../store/selectionStore";
import { CalendarView } from "./CalendarView";

/**
 * 감사 A 죽은 버튼 — 캘린더 "일정 추가"(선택 날짜 B6 프리필)·주 일정 블록 클릭(장소 상세 열기)이
 * 실제로 오버레이 스토어를 통해 동작하는지 검증. PLAN_FIXTURE(trip_1, owner=editor+) 사용.
 */
beforeEach(() => {
  useCalendarStore.setState({ mode: "month", cursorDate: null });
  useSelectionStore.setState({ selectedDate: null });
  useOverlayStore.setState({
    active: null,
    placeId: null,
    placePrefill: null,
    expenseId: null,
  });
});

describe("CalendarView — 일정 추가(죽은 버튼 수정)", () => {
  it("툴바 '일정 추가' → 선택 날짜로 장소 추가 프리필 오버레이", async () => {
    renderWithClient(<CalendarView tripId="trip_1" />);
    await screen.findByText("2026년 4월"); // 로드

    fireEvent.click(screen.getByRole("button", { name: "일정 추가" }));

    const st = useOverlayStore.getState();
    expect(st.active).toBe("place");
    // cursor 기본 = 트립 시작일(2026-04-18) → 그 날짜에 배정 프리필(B6)
    expect(st.placePrefill?.scheduledDate).toBe("2026-04-18");
  });
});

describe("CalendarView — 주 일정 블록 클릭(죽은 버튼 수정)", () => {
  it("주 모드 블록 클릭 → 장소 상세 오버레이(placeId)", async () => {
    useCalendarStore.setState({ mode: "week", cursorDate: "2026-04-18" });
    renderWithClient(<CalendarView tripId="trip_1" />);
    // Day1 09:00 츠키지 블록(주 타임라인)
    const block = await screen.findByRole("button", { name: "츠키지 장외시장 상세" });
    fireEvent.click(block);

    const st = useOverlayStore.getState();
    expect(st.active).toBe("place");
    expect(st.placeId).toBe("d1a");
  });
});
