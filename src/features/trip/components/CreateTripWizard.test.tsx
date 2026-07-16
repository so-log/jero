import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

import { makeClient } from "@/test/utils";

import type { CreateTripInput } from "../lib/tripSchema";
import { CreateTripWizard } from "./CreateTripWizard";
import { Step3Members } from "./steps/Step3Members";

// 라우터만 모킹(마운트 시 이동 없음). 데이터 훅은 QueryClient 로 충분(마운트 부수효과 없음).
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function withClient(ui: ReactElement) {
  return <QueryClientProvider client={makeClient()}>{ui}</QueryClientProvider>;
}

describe("CreateTripWizard — 데모 프리필 제거", () => {
  it("Step1 제목·나라·지역이 빈 값이고 placeholder 를 보인다(커버/아이콘 기본 선택은 유지)", () => {
    render(withClient(<CreateTripWizard />));

    const title = screen.getByPlaceholderText(
      "예: 도쿄, 우리끼리 4일",
    ) as HTMLInputElement;
    const country = screen.getByPlaceholderText(
      "나라 선택 또는 입력",
    ) as HTMLInputElement;
    const region = screen.getByPlaceholderText(
      "도시 선택 또는 입력",
    ) as HTMLInputElement;

    expect(title.value).toBe("");
    expect(country.value).toBe("");
    expect(region.value).toBe("");

    // 커버 기본 선택(blue) 유지.
    expect(screen.getByRole("button", { name: "blue" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    // 데모 멤버 흔적 없음.
    expect(screen.queryByText(/minjun|seoyoon/)).toBeNull();
  });
});

describe("Step3Members — 기본 멤버는 나만", () => {
  const EMPTY: CreateTripInput = {
    title: "",
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

  function Harness() {
    const methods = useForm<CreateTripInput>({ defaultValues: EMPTY });
    return (
      <FormProvider {...methods}>
        <Step3Members />
      </FormProvider>
    );
  }

  it("초대 멤버 프리필 없이 소유자(나)만 표시된다", () => {
    render(withClient(<Harness />));

    // 소유자 행만 존재.
    expect(screen.getByText("소유자")).toBeInTheDocument();
    expect(screen.getByText("(나)")).toBeInTheDocument();
    // 초대된 멤버 행(역할 토글)·목 멤버 없음.
    expect(screen.queryByText("편집 가능")).toBeNull();
    expect(screen.queryByText(/minjun|seoyoon/)).toBeNull();
  });
});
