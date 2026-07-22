import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CityView } from "../lib/citySelectors";
import { CityTabs } from "./CityTabs";

const CITIES: CityView[] = [
  { id: "c-tokyo", name: "도쿄", seq: 0, nights: 2, startDate: "2026-04-18", endDate: "2026-04-19", lat: null, lng: null, country: "일본" },
  { id: "c-osaka", name: "오사카", seq: 1, nights: 1, startDate: "2026-04-20", endDate: "2026-04-21", lat: null, lng: null, country: "일본" },
];

describe("CityTabs", () => {
  it("도시 목록을 탭으로 렌더하고 활성 도시를 aria-selected 로 표시", () => {
    render(<CityTabs cities={CITIES} activeCityId="c-tokyo" onSelect={() => {}} />);
    const tokyo = screen.getByRole("tab", { name: /도쿄/ });
    const osaka = screen.getByRole("tab", { name: /오사카/ });
    expect(tokyo).toHaveAttribute("aria-selected", "true");
    expect(osaka).toHaveAttribute("aria-selected", "false");
    expect(screen.getByText("2박")).toBeInTheDocument();
  });

  it("도시 클릭 시 onSelect(cityId) 호출", () => {
    const onSelect = vi.fn();
    render(<CityTabs cities={CITIES} activeCityId="c-tokyo" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("tab", { name: /오사카/ }));
    expect(onSelect).toHaveBeenCalledWith("c-osaka");
  });
});
