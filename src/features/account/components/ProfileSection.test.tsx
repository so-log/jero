import { fireEvent, screen, waitFor } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";

import { renderWithClient } from "@/test/utils";

import type { ProfileForm } from "../lib/profileSchema";
import { ProfileSection } from "./ProfileSection";

// hasSupabase=false(테스트) → 업로드는 검증만 수행하고 저장은 no-op. 검증 실패는 그대로 노출.

function Harness({ avatarUrl }: { avatarUrl?: string | null }) {
  const methods = useForm<ProfileForm>({
    defaultValues: {
      name: "지현",
      avatarColor: "#3B7DF0",
      currency: "KRW",
      notif: { trip: true, comment: true, settle: true, marketing: false },
    },
  });
  return (
    <FormProvider {...methods}>
      <ProfileSection email="a@b.com" avatarUrl={avatarUrl} />
    </FormProvider>
  );
}

describe("ProfileSection — 아바타", () => {
  it("사진 없으면 이니셜 폴백 · 삭제 버튼 없음", () => {
    renderWithClient(<Harness />);
    expect(screen.getByText("지")).toBeInTheDocument(); // 이니셜
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.queryByText("삭제")).toBeNull();
  });

  it("사진 있으면 이미지 + 삭제 버튼", () => {
    renderWithClient(<Harness avatarUrl="https://cdn/u1/avatar.png" />);
    expect(screen.getByAltText("프로필 사진")).toHaveAttribute(
      "src",
      "https://cdn/u1/avatar.png",
    );
    expect(screen.getByText("삭제")).toBeInTheDocument();
  });

  it("비이미지 선택 → 에러 노출(업로드 거부)", async () => {
    const { container } = renderWithClient(<Harness />);
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const bad = new File(["x"], "a.txt", { type: "text/plain" });
    fireEvent.change(input, { target: { files: [bad] } });
    await waitFor(() =>
      expect(screen.getByText(/이미지 파일만/)).toBeInTheDocument(),
    );
  });
});
