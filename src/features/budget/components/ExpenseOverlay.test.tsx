import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MEMBERS_FIXTURE, deriveDays } from "@/features/itinerary";
import { renderWithClient } from "@/test/utils";

import type { ExpenseDto } from "../types";
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

  it("편집 모드: 제목 '지출 편집' + 값 프리필(금액·항목명·통화)", async () => {
    const expense: ExpenseDto = {
      id: "e1",
      spent_on: "2026-04-19", // days[1] → DAY 2
      name: "편집 대상 지출",
      category: "food",
      payer_id: MEMBERS_FIXTURE[0].id,
      split: [MEMBERS_FIXTURE[0].id],
      amount: 30000,
      currency: "KRW",
    };
    renderWithClient(
      <ExpenseOverlay
        open
        onClose={vi.fn()}
        tripId="trip_1"
        members={MEMBERS_FIXTURE}
        days={days}
        expense={expense}
      />,
    );
    expect(await screen.findByText("지출 편집")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("예: 긴자 식스 쇼핑")).toHaveValue(
      "편집 대상 지출",
    );
    expect(screen.getByPlaceholderText("0")).toHaveValue("30,000");
  });

  it("편집 모드: 저장 시 닫힌다", async () => {
    const onClose = vi.fn();
    const expense: ExpenseDto = {
      id: "e1",
      spent_on: "2026-04-18",
      name: "편집 대상",
      category: "food",
      payer_id: MEMBERS_FIXTURE[0].id,
      split: [MEMBERS_FIXTURE[0].id],
      amount: 12000,
      currency: "KRW",
    };
    renderWithClient(
      <ExpenseOverlay
        open
        onClose={onClose}
        tripId="trip_1"
        members={MEMBERS_FIXTURE}
        days={days}
        expense={expense}
      />,
    );
    await screen.findByText("지출 편집");
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
