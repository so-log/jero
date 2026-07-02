import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MEMBERS_FIXTURE, deriveDays } from "@/features/itinerary";
import { renderWithClient } from "@/test/utils";

import { ExpenseOverlay } from "./ExpenseOverlay";

/** 10 지출 오버레이 — 검증(금액 0 차단) + 저장 시 닫힘(수용 기준 §11). */
const days = deriveDays("2026-04-18", "2026-04-21");

describe("ExpenseOverlay", () => {
  it("금액 미입력이면 에러 배너 + 저장 차단", async () => {
    const onClose = vi.fn();
    renderWithClient(
      <ExpenseOverlay open onClose={onClose} tripId="trip_1" members={MEMBERS_FIXTURE} days={days} />,
    );
    expect(await screen.findByText("지출 추가")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByText("입력값을 확인해 주세요.")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("유효 입력 저장 시 오버레이가 닫힌다", async () => {
    const onClose = vi.fn();
    renderWithClient(
      <ExpenseOverlay open onClose={onClose} tripId="trip_1" members={MEMBERS_FIXTURE} days={days} />,
    );
    await screen.findByText("지출 추가");
    fireEvent.change(screen.getByPlaceholderText("0"), { target: { value: "152000" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
