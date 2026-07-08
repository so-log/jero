import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { deriveDays } from "@/features/itinerary";

import { AddToScheduleMenu } from "./AddToScheduleMenu";

const days = deriveDays("2026-08-01", "2026-08-03"); // 3일

afterEach(() => {
  vi.restoreAllMocks();
});

function openMenu() {
  fireEvent.click(screen.getByRole("button", { name: /일정에 추가/ }));
}

describe("AddToScheduleMenu 배정/해제", () => {
  it("열면 날짜 목록이 보이고, 선택 시 1-based Day 로 onAssign 호출", () => {
    const onAssign = vi.fn();
    render(
      <AddToScheduleMenu
        days={days}
        assignedDay={null}
        canEdit
        onAssign={onAssign}
        onUnassign={vi.fn()}
      />,
    );
    openMenu();
    expect(screen.getByText("어느 날짜에 추가할까요?")).toBeInTheDocument();
    // 첫 번째 날짜 옵션 클릭 → Day 1
    fireEvent.click(screen.getByText(days[0].label));
    expect(onAssign).toHaveBeenCalledWith(1);
  });

  it("배정된 상태면 'Day N에 추가됨' + '취소'(onUnassign)", () => {
    const onUnassign = vi.fn();
    render(
      <AddToScheduleMenu
        days={days}
        assignedDay={2}
        canEdit
        onAssign={vi.fn()}
        onUnassign={onUnassign}
      />,
    );
    expect(screen.getByText(/Day 2에 추가됨/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(onUnassign).toHaveBeenCalled();
  });

  it("viewer(canEdit=false)는 '저장된 장소'만 표시", () => {
    render(
      <AddToScheduleMenu
        days={days}
        assignedDay={null}
        canEdit={false}
        onAssign={vi.fn()}
        onUnassign={vi.fn()}
      />,
    );
    expect(screen.getByText("저장된 장소")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /일정에 추가/ })).toBeNull();
  });
});

describe("AddToScheduleMenu 드롭다운 방향(뷰포트 인식)", () => {
  it("아래 공간이 충분하면 아래로 연다(top-*)", () => {
    // jsdom 기본 getBoundingClientRect=0 → below 충분 → 아래로.
    render(
      <AddToScheduleMenu
        days={days}
        assignedDay={null}
        canEdit
        onAssign={vi.fn()}
        onUnassign={vi.fn()}
      />,
    );
    openMenu();
    const menu = screen.getByText("어느 날짜에 추가할까요?").parentElement;
    expect(menu?.className).toContain("top-[calc(100%+6px)]");
  });

  it("아래 공간이 부족하고 위가 넓으면 위로 flip(bottom-*)", () => {
    // 트리거를 뷰포트 하단 근처로: below 작음, above 큼 → 위로.
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      bottom: window.innerHeight - 8,
      top: window.innerHeight - 40,
      left: 0,
      right: 0,
      width: 0,
      height: 32,
      x: 0,
      y: window.innerHeight - 40,
      toJSON: () => ({}),
    } as DOMRect);
    render(
      <AddToScheduleMenu
        days={days}
        assignedDay={null}
        canEdit
        onAssign={vi.fn()}
        onUnassign={vi.fn()}
      />,
    );
    openMenu();
    const menu = screen.getByText("어느 날짜에 추가할까요?").parentElement;
    expect(menu?.className).toContain("bottom-[calc(100%+6px)]");
  });
});
