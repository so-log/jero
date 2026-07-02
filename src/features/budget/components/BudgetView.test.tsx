import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithClient } from "@/test/utils";

import { BudgetView } from "./BudgetView";

/** 07 예산 통합 — 지표·정산·지출 내역이 데이터에서 렌더(수용 기준 §11). 차트(Recharts)는 시각만, 내용 미검증. */
describe("BudgetView", () => {
  it("지표·정산 요약·지출 내역이 렌더된다", async () => {
    renderWithClient(<BudgetView tripId="trip_1" />);
    // "1인당 금액"은 고유 라벨 → 렌더 대기 게이트. ("총지출"은 지표+도넛 중앙에 2회 등장)
    expect(await screen.findByText("1인당 금액")).toBeInTheDocument();
    expect(screen.getAllByText("총지출").length).toBeGreaterThan(0);
    expect(screen.getByText("남은 예산")).toBeInTheDocument();
    expect(screen.getByText(/건으로 정산/)).toBeInTheDocument();
    expect(screen.getByText("지출 내역")).toBeInTheDocument();
    expect(screen.getByText("긴자 식스 쇼핑")).toBeInTheDocument();
  });
});
