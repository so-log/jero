import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MapSearchBox } from "./MapSearchBox";

// usePlacesAutocomplete 를 모킹해 넘겨진 onSelect 콜백을 캡처(실제 Google API 없이 배선 검증).
let captured: ((s: unknown) => void) | null = null;
vi.mock("@/components/map", () => ({
  usePlacesAutocomplete: (_ref: unknown, onSelect: (s: unknown) => void) => {
    captured = onSelect;
    return { ready: true };
  },
}));

describe("MapSearchBox", () => {
  it("검색 입력을 렌더하고, 자동완성 선택을 onSelect 로 그대로 전달한다", () => {
    const onSelect = vi.fn();
    render(<MapSearchBox onSelect={onSelect} />);

    expect(
      screen.getByPlaceholderText("지도에서 장소 검색"),
    ).toBeInTheDocument();

    // 훅이 place_changed 시 호출하는 콜백 = 우리 prop → 상위로 그대로 전달.
    captured?.({
      name: "블루보틀",
      address: "서울 성수",
      lat: 37.54,
      lng: 127.05,
      placeId: "p_1",
    });
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ name: "블루보틀", placeId: "p_1" }),
    );
  });
});
