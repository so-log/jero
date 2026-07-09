import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PAMPHLET_THEMES } from "@/lib/constants/pamphletThemes";
import { renderWithClient } from "@/test/utils";

import type { PamphletData } from "../api/usePamphletData";
import type { PamphletSections } from "../lib/faces";
import { DEFAULT_PREP } from "../lib/prep";
import { PamphletPreview } from "./PamphletPreview";

const ALL: PamphletSections = { cover: true, schedule: true, prep: true, intro: true, qr: true };

function data(days: PamphletData["days"]): PamphletData {
  return {
    title: "도쿄 여행",
    dates: "2026. 8. 1 – 8. 3",
    nights: "2박 3일",
    place: "일본 · 도쿄",
    intro: "소개 문구",
    highlights: ["센소지"],
    days,
    isEmpty: days.length === 0,
    isLoading: false,
  };
}

const dayFixture: PamphletData["days"] = [
  { label: "DAY 1", date: "8.1 토", items: [{ t: "10:00", name: "센소지", cat: "museum", memo: "" }] },
];

function renderPreview(sections: PamphletSections, days = dayFixture) {
  renderWithClient(
    <PamphletPreview
      tripId="t"
      theme={PAMPHLET_THEMES.beach}
      data={data(days)}
      prep={DEFAULT_PREP}
      sections={sections}
      panelWidth={150}
    />,
  );
}

describe("PamphletPreview", () => {
  it("표지·일정 렌더(제목·Day 시간)", () => {
    renderPreview(ALL);
    expect(screen.getByText("도쿄 여행")).toBeInTheDocument(); // 표지 제목
    expect(screen.getByText("10:00")).toBeInTheDocument(); // Day 패널 아이템 시간(전용)
  });

  it("일정표 섹션 off → Day 패널 미표시", () => {
    renderPreview({ ...ALL, schedule: false });
    expect(screen.getByText("도쿄 여행")).toBeInTheDocument();
    expect(screen.queryByText("10:00")).toBeNull();
  });

  it("빈 일정 → Day 패널 없음(표지·준비물 등만)", () => {
    renderPreview(ALL, []);
    expect(screen.queryByText("10:00")).toBeNull();
    expect(screen.getByText("준비물 체크")).toBeInTheDocument();
  });
});
