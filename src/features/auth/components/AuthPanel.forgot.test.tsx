import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithClient } from "@/test/utils";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { AuthPanel } from "./AuthPanel";

/**
 * 비밀번호 찾기 인라인 흐름 — 링크 클릭 → 이메일-only 폼 → 발송 후 일반화 안내(가입 여부 비노출).
 * hasSupabase=false(테스트) → requestPasswordReset 스텁 성공.
 */
describe("AuthPanel — 비밀번호 찾기", () => {
  it("'비밀번호를 잊으셨나요?' → 재설정 뷰로 전환", () => {
    renderWithClient(<AuthPanel />);
    fireEvent.click(screen.getByText("비밀번호를 잊으셨나요?"));
    expect(screen.getByText("비밀번호 재설정")).toBeInTheDocument();
    expect(screen.getByText("재설정 링크 보내기")).toBeInTheDocument();
  });

  it("이메일 제출 → 일반화된 발송 안내", async () => {
    renderWithClient(<AuthPanel />);
    fireEvent.click(screen.getByText("비밀번호를 잊으셨나요?"));
    fireEvent.change(screen.getByPlaceholderText("you@email.com"), {
      target: { value: "a@b.com" },
    });
    fireEvent.click(screen.getByText("재설정 링크 보내기"));
    await waitFor(() =>
      expect(screen.getByText(/재설정 링크를 보냈어요/)).toBeInTheDocument(),
    );
  });

  it("잘못된 이메일 → 검증 에러, 발송 안 함", async () => {
    renderWithClient(<AuthPanel />);
    fireEvent.click(screen.getByText("비밀번호를 잊으셨나요?"));
    fireEvent.change(screen.getByPlaceholderText("you@email.com"), {
      target: { value: "nope" },
    });
    fireEvent.click(screen.getByText("재설정 링크 보내기"));
    expect(
      await screen.findByText("올바른 이메일 주소를 입력해 주세요"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/재설정 링크를 보냈어요/)).toBeNull();
  });

  it("'로그인으로 돌아가기' → 로그인 뷰 복귀", () => {
    renderWithClient(<AuthPanel />);
    fireEvent.click(screen.getByText("비밀번호를 잊으셨나요?"));
    fireEvent.click(screen.getByText("로그인으로 돌아가기"));
    expect(screen.getByText("다시 오신 걸 환영해요")).toBeInTheDocument();
  });
});
