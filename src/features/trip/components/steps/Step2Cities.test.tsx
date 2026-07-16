import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";

import type { CreateTripInput } from "../../lib/tripSchema";
import { Step2Cities } from "./Step2Cities";

/** Phase 2 — 마법사 도시 입력: 추가/삭제·박수 스테퍼·총계·날짜 파생. */
const DEFAULTS: CreateTripInput = {
  title: "여행",
  icon: "building",
  cover: "blue",
  country: "",
  region: "",
  start_date: "",
  end_date: "",
  cities: [{ name: "", country: "", nights: 1 }],
  members: [],
  startMode: "blank",
  templateId: null,
};

let latestValues: CreateTripInput;

function Harness() {
  const methods = useForm<CreateTripInput>({ defaultValues: DEFAULTS });
  latestValues = methods.watch();
  return (
    <FormProvider {...methods}>
      <Step2Cities />
    </FormProvider>
  );
}

function renderStep(): void {
  render(<Harness /> as ReactNode);
}

describe("Step2Cities", () => {
  it("기본 도시 1개 + 총계('1개 도시 · 총 1박 2일')", () => {
    renderStep();
    expect(screen.getByText("1개 도시 · 총 1박 2일")).toBeInTheDocument();
    expect(screen.getByLabelText("시작일")).toBeInTheDocument();
    // 도시 1개면 삭제 비활성
    expect(screen.getByRole("button", { name: "1번째 도시 삭제" })).toBeDisabled();
  });

  it("도시 추가 → 2개, 총계 갱신", () => {
    renderStep();
    fireEvent.click(screen.getByRole("button", { name: "도시 추가" }));
    // 2개 도시 · 총 2박 3일(각 1박)
    expect(screen.getByText("2개 도시 · 총 2박 3일")).toBeInTheDocument();
    expect(latestValues.cities).toHaveLength(2);
  });

  it("박수 스테퍼(+/−) → 총계·값 반영", () => {
    renderStep();
    fireEvent.click(screen.getByRole("button", { name: "박수 증가" }));
    expect(screen.getByText("1개 도시 · 총 2박 3일")).toBeInTheDocument();
    expect(latestValues.cities[0].nights).toBe(2);
    fireEvent.click(screen.getByRole("button", { name: "박수 감소" }));
    fireEvent.click(screen.getByRole("button", { name: "박수 감소" }));
    expect(latestValues.cities[0].nights).toBe(0); // 0 에서 멈춤(disabled)
    expect(screen.getByRole("button", { name: "박수 감소" })).toBeDisabled();
  });

  it("시작일 입력 → 종료일 파생 + 도시 날짜 배지", () => {
    renderStep();
    fireEvent.change(screen.getByLabelText("시작일"), {
      target: { value: "2026-08-01" },
    });
    // 1박 → 종료일 = 8.2
    expect(latestValues.end_date).toBe("2026-08-02");
    // 날짜 범위 배지(8.1–8.2 · 1박)
    expect(screen.getByText(/8\.1–8\.2 · 1박/)).toBeInTheDocument();
  });

  it("도시 이름 입력 → 폼 값 반영", () => {
    renderStep();
    fireEvent.change(screen.getByPlaceholderText("도시 이름 (예: 오사카)"), {
      target: { value: "오사카" },
    });
    expect(latestValues.cities[0].name).toBe("오사카");
  });
});
