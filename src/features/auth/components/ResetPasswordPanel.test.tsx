import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithClient } from "@/test/utils";

const push = vi.hoisted(() => vi.fn());
const authState = vi.hoisted(() => ({ authenticated: true }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));
vi.mock("../api/useAuthUser", () => ({
  useAuthUser: () => ({ data: { authenticated: authState.authenticated }, isLoading: false }),
}));

import { ResetPasswordPanel } from "./ResetPasswordPanel";

beforeEach(() => {
  push.mockClear();
  authState.authenticated = true;
});

describe("ResetPasswordPanel — 새 비밀번호 설정", () => {
  it("복구 세션 있으면 새 비번 폼 노출", () => {
    renderWithClient(<ResetPasswordPanel />);
    expect(screen.getByText("새 비밀번호 설정")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("8자 이상")).toBeInTheDocument();
  });

  it("8자+ 일치 제출 → /trips 이동(스텁 성공)", async () => {
    renderWithClient(<ResetPasswordPanel />);
    fireEvent.change(screen.getByPlaceholderText("8자 이상"), {
      target: { value: "newsecret12" },
    });
    fireEvent.change(screen.getByPlaceholderText("한 번 더 입력"), {
      target: { value: "newsecret12" },
    });
    fireEvent.click(screen.getByText("비밀번호 변경하기"));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/trips"));
  });

  it("확인 불일치 → 에러, 이동 안 함", async () => {
    renderWithClient(<ResetPasswordPanel />);
    fireEvent.change(screen.getByPlaceholderText("8자 이상"), {
      target: { value: "newsecret12" },
    });
    fireEvent.change(screen.getByPlaceholderText("한 번 더 입력"), {
      target: { value: "different99" },
    });
    fireEvent.click(screen.getByText("비밀번호 변경하기"));
    expect(
      await screen.findByText("비밀번호가 일치하지 않아요"),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("복구 세션 없으면(만료/무효) 안내 + 폼 없음", () => {
    authState.authenticated = false;
    renderWithClient(<ResetPasswordPanel />);
    expect(screen.getByText("링크가 만료됐어요")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("8자 이상")).toBeNull();
  });
});
