import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PlaceDto } from "@/features/itinerary";

import { SavedPlaceCard } from "./SavedPlaceCard";

/** B9 — 카드에서 바로 삭제 액션(권한 있을 때만 노출, 카드 선택과 분리). */
const PLACE: PlaceDto = {
  id: "p1",
  name: "가츠라 카페",
  category: "cafe",
  scheduled_date: null,
  order_in_day: null,
  start_time: null,
  duration_min: null,
  memo: null,
  lat: null,
  lng: null,
  area: "시부야",
};

describe("SavedPlaceCard 삭제 액션(B9)", () => {
  it("onDelete 있으면 삭제 버튼 노출 + 클릭 시 onDelete 호출(카드 select 안 됨)", () => {
    const onDelete = vi.fn();
    const onSelect = vi.fn();
    render(
      <SavedPlaceCard
        place={PLACE}
        selected={false}
        onSelect={onSelect}
        action={<span>action</span>}
        onDelete={onDelete}
      />,
    );
    const btn = screen.getByRole("button", { name: "가츠라 카페 삭제" });
    fireEvent.click(btn);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled(); // stopPropagation
  });

  it("onDelete 없으면(뷰어 등) 삭제 버튼 미표시", () => {
    render(
      <SavedPlaceCard
        place={PLACE}
        selected={false}
        onSelect={vi.fn()}
        action={<span>action</span>}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "가츠라 카페 삭제" }),
    ).not.toBeInTheDocument();
  });
});
