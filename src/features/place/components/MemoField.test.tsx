import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithClient } from "@/test/utils";

import { MemoField } from "./MemoField";

// useAutosaveMemo 를 목으로 대체해 저장 호출 횟수·인자 관찰(디바운스 검증).
const mutate = vi.hoisted(() => vi.fn());
vi.mock("../api/useUpsertPlace", () => ({
  useAutosaveMemo: () => ({ mutate }),
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("MemoField 자동저장(디바운스)", () => {
  it("연속 입력 → 600ms 후 마지막 값으로 1회만 저장", () => {
    vi.useFakeTimers();
    renderWithClient(
      <MemoField tripId="t" placeId="p1" initial="" canEdit />,
    );
    const ta = screen.getByPlaceholderText("함께 보면 좋은 메모를 남겨보세요");
    fireEvent.change(ta, { target: { value: "가" } });
    fireEvent.change(ta, { target: { value: "가나" } });
    fireEvent.change(ta, { target: { value: "가나다" } });
    // 아직 디바운스 전 — 저장 없음
    expect(mutate).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0]).toEqual({ placeId: "p1", memo: "가나다" });
  });

  it("저장 성공 시 '저장됨' 표시", () => {
    vi.useFakeTimers();
    mutate.mockImplementation((_vars, opts?: { onSuccess?: () => void }) =>
      opts?.onSuccess?.(),
    );
    renderWithClient(<MemoField tripId="t" placeId="p1" initial="" canEdit />);
    fireEvent.change(screen.getByPlaceholderText("함께 보면 좋은 메모를 남겨보세요"), {
      target: { value: "메모" },
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.getByText("저장됨")).toBeInTheDocument();
  });

  it("viewer(canEdit=false)는 읽기 전용(입력 없음)", () => {
    render(<MemoField tripId="t" placeId="p1" initial="여행 메모" canEdit={false} />);
    expect(screen.getByText("여행 메모")).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("함께 보면 좋은 메모를 남겨보세요"),
    ).toBeNull();
  });

  it("신규(placeId 없음)는 자동저장하지 않고 onChange 로만 전달", () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<MemoField tripId="t" initial="" canEdit onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText("함께 보면 좋은 메모를 남겨보세요"), {
      target: { value: "새장소 메모" },
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(mutate).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenLastCalledWith("새장소 메모");
  });
});
